const maxLimit = 60; // max AWS allows

//
// For AWS list APIs that paginate, this method will retrieve all the data
//
module.exports = async function getFullList(getFn, attrs, resultKey) {
  let results = [];

  attrs = Object.assign({ Limit: maxLimit }, attrs);
  let res = await getFn(attrs);
  results.push(...res[resultKey]);

  while (res.NextToken) {
    res = await getFn(Object.assign({ NextToken: res.NextToken }, attrs));
    results.push(...res[resultKey]);
  }

  return results;
};
