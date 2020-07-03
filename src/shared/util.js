export const evalInContext = (ctx, code) => {
    const negate = {};

    for(const p in this) negate[p] = undefined;

    return (new Function(`with(this){ ${code} }`).call({
        ...negate,
        ...ctx
    }));
};