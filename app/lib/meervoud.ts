// "1 onderdeel", "2 onderdelen": één plek voor enkelvoud/meervoud bij een aantal (nooit "1 onderdelen").
export const meervoud = (n: number, enkelvoud: string, meerv: string) => `${n} ${n === 1 ? enkelvoud : meerv}`;
