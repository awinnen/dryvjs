function valueOfDate(value, locale, format) {
    new Date(value).getTime();
}

const defaultOptions = {
    global: typeof window !== 'undefined'
        ? window
        : typeof global !== 'undefined'
            ? global
            : null,
    valueOfDate: valueOfDate,
    errorField: "error",
    warningField: "warning",
    hasErrorField: "hasError"
};

if(typeof fetch !== 'undefined')
{
    defaultOptions.get = fetch;
    defaultOptions.post = (url, data) => fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=UTF-8' },
        body: JSON.stringify(data),
    });
}

export default {
    dryvGroupTag: "dryv-group",
    dryvSetDirective: "dryv-set",
    dryvFieldDirective: "dryv",

    createOptions(o) {
        if (o._dryv_created) {
            return o;
        }

        const options = Object.assign({}, defaultOptions, o);
        if (!options.handleResult) {
            options.handleResult = function (context, model, path, ruleName, result) {
                return context && context.handleResult ? context.handleResult(context, model, path, ruleName, result) : result;
            };
        }
        if (!options.callServer) {
            options.callServer = async function (baseUrl, method, data) {
                const isGet = method === "GET";
                const url = isGet ? baseUrl + "?" + Object.keys(data).map(k => `${k}=${encodeURIComponent(data[k])}`).join('&') : baseUrl;
                const response = isGet
                    ? await options.get(url)
                    : await options.post(url, data);

                return response.data;
            };
        }

        options._dryv_created = true;
        return options;
    }
}