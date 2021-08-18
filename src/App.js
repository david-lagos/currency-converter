import { ethers } from 'ethers';
import { ChainId, Fetcher, Route, Price, Token } from '@uniswap/sdk';
import axios from 'axios';
import React, { useEffect, useState } from 'react';
import './App.css';
import GetPoolData from './getPoolData';
import CurrencyRow from './CurrencyRow';
import Estimates from './Estimates';

const pool = {
  ids: {
    from: '0xc778417E063141139Fce010982780140Aa0cD5Ab',
    to: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984'
  },
  symbols: {
    from: 'WETH',
    to: 'UNI'
  },
  fees24h: 1000
};

function App() {
  const [currencyOptions, setCurrencyOptions] = useState([]);
  const [fromCurrency, setFromCurrency] = useState();
  const [toCurrency, setToCurrency] = useState();
  const [fromBalance, setFromBalance] = useState();
  const [toBalance, setToBalance] = useState();
  const [fromPrice, setFromPrice] = useState();
  const [toPrice, setToPrice] = useState();
  const [poolLiquidity, setPoolLiquidity] = useState();
  const [numerator, setNumerator] = useState(1);
  const [denominator, setDenominator] = useState(1);
  const [token0, setToken0] = useState(new Token(4, pool.ids.from, 18, pool.symbols.from));
  const [token1, setToken1] = useState(new Token(4, pool.ids.to, 18, pool.symbols.to));
  const [amount, setAmount] = useState('');
  const [amountInFromCurrency, setAmountInFromCurrency] = useState(true);
  
  let toAmount, fromAmount
  
  if(amountInFromCurrency){
    fromAmount = amount
    toAmount = precise(amount, numerator, denominator, token1);
  } else {
    toAmount = amount
    fromAmount = precise(amount, denominator, numerator, token0)
  }  

  let dailyIncome, monthlyIncome

  dailyIncome = calculateIncome(1);
  monthlyIncome = calculateIncome(30);

  useEffect(() => {

    // Scope for these two is local
    const fromCurrency = pool.symbols.from;
    const toCurrency = pool.symbols.to;

    // State setters
    setCurrencyOptions([...Object.values(pool.symbols)])
    setFromCurrency(fromCurrency)
    setToCurrency(toCurrency)
    getMidPrice(pool).then(({midPriceNum, midPriceDen, token0, token1, balance0, balance1, price0, price1, poolLiquidity}) => {
      setNumerator(midPriceNum)
      setDenominator(midPriceDen)
      setToken0(token0);
      setToken1(token1);
      setFromBalance(balance0);
      setToBalance(balance1);
      setFromPrice(price0);
      setToPrice(price1);
      setPoolLiquidity(poolLiquidity);
    });
  }, []) 

  // Functions
  
  function handleFromAmountChange(e) {
    setAmount(e.target.value)
    setAmountInFromCurrency(true)
  }

  function handleToAmountChange(e) {
    setAmount(e.target.value)
    setAmountInFromCurrency(false)
  }

  const getMidPrice = async(pool) => {
      
    // Set chain id
    const chainId = ChainId.RINKEBY;
    
    // Define provider
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const address = await signer.getAddress();

    // Create token and pair instances
    const token0 = await Fetcher.fetchTokenData(chainId, pool.ids.from, provider, pool.symbols.from);
    const token1 = await Fetcher.fetchTokenData(chainId, pool.ids.to, provider, pool.symbols.to);
    const pair = await Fetcher.fetchPairData(token0, token1, provider);
    const route = new Route([pair], token0);

    const token0Contract = new ethers.Contract(
      token0.address,
      [
      'function approve(address spender, uint rawAmount) external returns (bool)',
      'function allowance(address owner, address spender) external view returns (uint)',
      'function balanceOf(address account) external view returns (uint)'
      ],
      signer
    );

    const token1Contract = new ethers.Contract(
      token1.address,
      [
      'function approve(address spender, uint rawAmount) external returns (bool)',
      'function allowance(address owner, address spender) external view returns (uint)',
      'function balanceOf(address account) external view returns (uint)'
      ],
      signer
    );

    const balance0Obj = await token0Contract.balanceOf(address);
    const balance0 = parseFloat(ethers.utils.formatUnits(balance0Obj.toString(), token0.decimals)).toFixed(3);
    const balance1Obj = await token1Contract.balanceOf(address);
    const balance1 = parseFloat(ethers.utils.formatUnits(balance1Obj.toString(), token1.decimals)).toFixed(3);
    
    const price0 = await getPrice(pool.ids.from);
    const price1 = await getPrice(pool.ids.to);

    const liquidity0 = parseFloat(ethers.utils.formatUnits(pair.reserveOf(token0).raw.toString(), token0.decimals));
    const liquidity1 = parseFloat(ethers.utils.formatUnits(pair.reserveOf(token1).raw.toString(), token1.decimals));

    const poolLiquidity = (liquidity0 * price0) + (liquidity1 * price1);

    // Return elements
    return {
      midPriceNum: route.midPrice.numerator,
      midPriceDen: route.midPrice.denominator,
      token0,
      token1,
      balance0,
      balance1,
      price0,
      price1,
      poolLiquidity
    }
  }

  function precise(amount, num, den, tk) {
    if (amount === ''){
      return '';
    } else {
    // Convert numerator and input to Fixed Number
    const fixNum = ethers.FixedNumber.fromString(num.toString(), tk.decimals);
    const fixAmount = ethers.FixedNumber.from(amount);
    
    // Multiply numerator by input value, trim decimals on string representation
    const newNum = fixNum.mulUnsafe(fixAmount);
    const splitArr = newNum.toString().split('.');

    // Replace numerator with new value
    const newPrice = new Price(token1, token0, den, splitArr[0]);
    return newPrice.toSignificant(6)
    }
  }

  const getPrice = async(tokenId) => {
    if(tokenId == '0xc778417E063141139Fce010982780140Aa0cD5Ab'){
        let price = await axios.get("https://api.coingecko.com/api/v3/simple/price/", {
            params: {
                ids: 'ethereum',
                vs_currencies: 'usd'
            }
        });
        return price.data.ethereum.usd;
    } else {
        let price = await GetPoolData.getPriceData(tokenId.toLowerCase());  
        return parseFloat(parseFloat(price[0].priceUSD).toFixed(2));
    }
  }

  function calculateIncome(days) {
    const myLiquidity = (fromAmount * fromPrice) + (toAmount * toPrice);
    const myShare = (myLiquidity / (myLiquidity + poolLiquidity) * 100);
    const myReturn = (myShare * pool.fees24h * days).toFixed(2);
    return myReturn;
  }

  return (
    <>
      <h1>Convert</h1>
    <CurrencyRow 
      currencyOptions={currencyOptions}
      selectedCurrency={fromCurrency}
      onChangeCurrency={e => setFromCurrency(e.target.value)}
      onChangeAmount={handleFromAmountChange}
      amount={fromAmount}
      balance={fromBalance}
    />
    <div className="equals">=</div>
    <CurrencyRow 
      currencyOptions={currencyOptions}
      selectedCurrency={toCurrency}
      onChangeCurrency={(e) => setToCurrency(e.target.value)}
      onChangeAmount={handleToAmountChange}
      amount={toAmount}
      balance={toBalance}
    />
    <Estimates
      dailyIncome={dailyIncome}
      monthlyIncome={monthlyIncome}
    />
    </>
  );
}

export default App;