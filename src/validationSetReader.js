export default function (name, options) {
    const dryvRoot = options.global.dryv || (options.global.dryv = {});
    const validationSet = dryvRoot.v[name];
    if (!validationSet) {
        throw `No validation set with name '${name}' was found on the Dryv object supplied with the options.`;
    }
    return validationSet;
}