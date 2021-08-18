import React from 'react';

export default function Confirm(props) {
    const {
        onClick
    } = props

    return(
        <button onClick={onClick}>Confirm</button>
    );
}