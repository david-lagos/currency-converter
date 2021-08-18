const axios = require('axios');

const getPriceData = async(tokenKey) => {
    const result = await axios.post('https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3',
    {
        query: `
        {
            tokenHourDatas(first: 1 where: {token: "${tokenKey}"} orderBy: periodStartUnix orderDirection: desc){
              priceUSD
            }
        }`
    });
    
    return result.data.data.tokenHourDatas;
}

module.exports = { getPriceData }