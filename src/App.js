import { ethers } from 'ethers';
import { ChainId, Fetcher, Route, Price, Token } from '@uniswap/sdk';
import React, { useEffect, useState } from 'react';
import './App.css';
import CurrencyRow from './CurrencyRow';

const pool = {
  ids: {
    from: '0xc778417E063141139Fce010982780140Aa0cD5Ab',
    to: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984'
  },
  symbols: {
    from: 'WETH',
    to: 'UNI'
  }
};

function App() {
  const [currencyOptions, setCurrencyOptions] = useState([]);
  const [fromCurrency, setFromCurrency] = useState();
  const [toCurrency, setToCurrency] = useState();
  const [fromBalance, setFromBalance] = useState();
  const [toBalance, setToBalance] = useState();
  const [numerator, setNumerator] = useState(1);
  const [denominator, setDenominator] = useState(1);
  const [token0, setToken0] = useState(new Token(4, pool.ids.from, 18, pool.symbols.from));
  const [token1, setToken1] = useState(new Token(4, pool.ids.to, 18, pool.symbols.to));
  const [amount, setAmount] = useState('');
  const [amountInFromCurrency, setAmountInFromCurrency] = useState(true);
  
  let toAmount, fromAmount
  function precise(amount, num, den, tk0, tk1) {
    if (amount === ''){
      return '';
    } else {
    // Convert numerator and input to Fixed Number
    const fixNum = ethers.FixedNumber.fromString(num.toString(), tk1.decimals);
    const fixAmount = ethers.FixedNumber.from(amount);
    
    // Multiply numerator by input value, trim decimals on string representation
    const newNum = fixNum.mulUnsafe(fixAmount);
    const splitArr = newNum.toString().split('.');

    // Replace numerator with new value
    const newPrice = new Price(token1, token0, den, splitArr[0]);
    return newPrice.toSignificant(6)
    }
  }

  if(amountInFromCurrency){
    fromAmount = amount
    toAmount = precise(amount, numerator, denominator, token0, token1);
  } else {
    toAmount = amount
    fromAmount = precise(amount, denominator, numerator, token0, token1)
  }

  useEffect(() => {
    const fromCurrency = pool.symbols.from;
    const toCurrency = pool.symbols.to;
    setCurrencyOptions([...Object.values(pool.symbols)])
    setFromCurrency(fromCurrency)
    setToCurrency(toCurrency)
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
      
      // Return elements
      return {
        midPriceNum: route.midPrice.numerator,
        midPriceDen: route.midPrice.denominator,
        token0,
        token1,
        balance0,
        balance1
      }
    }
    getMidPrice(pool).then(({midPriceNum, midPriceDen, token0, token1, balance0, balance1}) => {
      setNumerator(midPriceNum)
      setDenominator(midPriceDen)
      setToken0(token0);
      setToken1(token1);
      setFromBalance(balance0);
      setToBalance(balance1);
    });

  }, []) 

  function handleFromAmountChange(e) {
    setAmount(e.target.value)
    setAmountInFromCurrency(true)
  }

  function handleToAmountChange(e) {
    setAmount(e.target.value)
    setAmountInFromCurrency(false)
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
    </>
  );
}

export default App;
