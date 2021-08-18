import React from 'react';

export default function Estimates(props) {

    const {
        dailyIncome,
        monthlyIncome
    } = props

    return (
        <div>
            <table>
            <td><span>Estimated Yield Income</span></td>
            <td>
                <tr>{dailyIncome} USD Daily</tr>
                <tr>{monthlyIncome} USD Monthly</tr>
            </td>
            </table>
        </div>
    );
}