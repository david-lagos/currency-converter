import React from 'react';

export default function Authorize(props) {
    
    const {
        currency,
        needAuth,
        onClick
    } = props

    return(
        <button style={needAuth ? {display: ''} : {display: 'none'} } onClick={onClick}> Authorize {currency}</button>
    )
}