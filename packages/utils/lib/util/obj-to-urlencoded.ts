const objToUrlencoded = (payload: {
  [key: string]: string | number | boolean;
}): string =>
  Object.keys(payload).reduce((url: string, key: string) => {
    if (typeof payload[key] === 'undefined' || payload[key] === null) {
      return url;
    }

    const segment = `${encodeURIComponent(key)}=${encodeURIComponent(
      payload[key]
    )}`;
    return url.length > 0 ? `${url}&${segment}` : segment;
  }, '');

export default objToUrlencoded;
