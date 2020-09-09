import readSet from "./validationSetReader"

function copyRules(dryv, name, options) {
    const validationSet = readSet(name, options);
    dryv.v = validationSet;
    dryv.params = validationSet.parameters;
}

function hashCode(text) {
    let hash = 0, i, chr;
    for (i = 0; i < text.length; i++) {
        chr = text.charCodeAt(i);
        hash = (hash << 5) - hash + chr;
        hash |= 0; // Convert to 32bit integer
    }
    return hash;
}

export default class DryvSet {
    constructor(name, path, options) {
        const dryv = Object.assign({}, { fieldValidators: [], namedValidators: {} }, options);
        copyRules(dryv, name, options);

        this.name = name;
        this.path = path;
        this.dryv = dryv;
        this.fields = [];
        this.groups = [];
        this.namedFields = {};
        this._lastDisabledFields = null;
        this._lastContext = null;
    }
    async validate(model, ctx) {
        const context = Object.assign({ dryv: this.dryv }, ctx);
        const fields = this.fields;

        if (!fields) {
            return true;
        }

        if (this.groups) {
            this.groups.forEach(c => c.clear());
        }

        const disablers = this.dryv.v.disablers;
        const disabledFields = [];

        if (disablers) {
            for (let field of Object.keys(disablers)) {
                const disabler = disablers[field];
                if (!disabler) {
                    continue;
                }

                var validationFunctions = disabler.filter(v => v.validate(model));

                if (validationFunctions.length) {
                    disabledFields.push(field + ".");
                }
            }
        }

        let errors = "";
        let warnings = "";

        for (let v of fields) {
            const result = await v.validate(model, context, disabledFields, v.related);
            if (!result) {
                continue;
            }

            switch (typeof result) {
                case "object":
                    switch (result.type) {
                        case "error":
                            errors += `${v.path}=${result.text};`;
                            break;
                        case "warning":
                            warnings += `${v.path}=${result.text};`;
                            break;
                    }
                    break;
                case "string":
                    errors += `${v.path}=${result};`;
                    break;
            }
        }

        this._lastDisabledFields = disabledFields || null;
        this._lastContext = context;

        return {
            hasErrors: errors.length > 0,
            errorHash: hashCode(errors),
            hasWarnings: warnings.length > 0,
            warningHash: hashCode(warnings)
        };
    }

    setResults(results) {
        if (this.fields) {
            this.fields.forEach(v => v.setResults(results));
        }

        return !results || results.length === 0;
    }
}