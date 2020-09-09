export default class DryvField {
    constructor(dryvSet, path, fieldComponent, groupComponent) {
        this.path = dryvSet.path
            ? directiveOptions.path = /^\s*~/.test(dryvSet.path)
                ? dryvSet.path.substr(1) + "." + directiveOptions.path
                : directiveOptions.path.substr(dryvSet.path.length + 1)
            : path;
        this.fieldComponent = fieldComponent;
        this.groupComponent = groupComponent;
        this.related = null;
        this._isValidating = false;
        this._lastGroups = [];
        this._lastDisabledFields = null;
        this._lastContext = null;
        this.dryvSet = dryvSet;
        this.rules = dryvSet.dryv.v.validators[this.path] || [];

        dryvSet.namedFields[this.path] = this;
        dryvSet.fields.push(this);

        const v1 = this.rules.map(v => v.annotations);
        v1.splice(0, 0, {});
        this.annotations = v1.reduce((t, s) => Object.assign(t, s));
    }

    async validate(data, context, disabledFields, validateRelated) {
        if (this._isValidating || !this.rules) {
            return null;
        }
        if (typeof context == "boolean") {
            validateRelated = context;
            context = null;
        }
        if (typeof disabledFields == "boolean") {
            validateRelated = disabledFields;
            disabledFields = null;
        }
        if (!(disabledFields = (disabledFields || this._lastDisabledFields)) ||
            !(context = (context || this._lastContext))) {
            return null;
        }

        this._lastDisabledFields = disabledFields;
        this._lastContext = context;
        this._isValidating = true;

        try {
            // TODO: move to caller?
            // if ($dryv.path) {
            //     $dryv.path.split(".").forEach(p => data = data[p]);
            // }

            let result = null;
            const isEnabled = !disabledFields || disabledFields.filter(f => this.path.indexOf(f) >= 0).length === 0;
            if (isEnabled) {
                result = await this.runValidation(data, context);
                if (validateRelated) {
                    if (!this.related) {
                        this.related = [].concat.apply([], validators.filter(v => !!v.related).map(v => v.related));
                    }
                    thia.related.forEach(path => this.dryvSet.namedFields[path].validate(data, disabledFields, context));
                }
            }

            return this.handleValidationResult(result);
        }
        finally {
            this._isValidating = false;
        }
    }
    setResults(results) {
        // TODO: consider directive path in 'results[this.path]'
        const result = results && results[this.path];
        return this.handleValidationResult(result);
    }
    runValidation(v, m, context) {
        return this.rules
            .map(rule => rule.validate)
            .reduce(
                (promiseChain, currentTask) => promiseChain.then(r => r || currentTask(m, context)),
                Promise.resolve());
    }

    handleValidationResult(result) {
        let type = null;
        let group = null;
        let text = null;

        if (result) {
            switch (typeof result) {
                case "object":
                    type = result.type;
                    group = result.group;
                    text = result.text;
                    break;
                case "string":
                    type = "error";
                    text = result;
                    break;
            }
        }

        const error = type === "error" && text;
        const warning = type === "warning" && text;

        const lastGroups = this._lastGroups;
        const fieldComponent = this.fieldComponent;
        const groupComponent = this.groupComponent;

        if (group && groupComponent) {
            error && groupComponent.addError(error, group);
            warning && groupComponent.addWarning(warning, group);

            fieldComponent.setHasError(!!error);
            fieldComponent.setError(null);
            fieldComponent.setWarning(null);

            if (lastGroups.indexOf(group) < 0) {
                lastGroups.push(group);
            }
        } else {
            fieldComponent.setHasError(!!error);
            fieldComponent.setError(error);
            fieldComponent.setWarning(warning);

            lastGroups.forEach(g => groupComponent.clear(g));
            this._lastGroups = [];
        }

        return text && { type, text, group };
    }
}