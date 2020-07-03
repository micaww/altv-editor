import styled, { css } from "styled-components";

export const SpacedContainer = styled.div`
    display: flex;
    flex-direction: row;
    justify-content: space-between;
`;

export const Button = styled.button`
    display: inline-block;
    border-radius: 4px;
    color: #c0c0c0;
    line-height: 25px;
    text-align: center;
    border: 1px solid #393939;
    padding: 0 5px;
    cursor: pointer;
    font-weight: 400;
    background: transparent;
    margin-left: ${props => props.marginLeft || 0}px;

    &:hover:not(:disabled) {
        background-color: #585858;
        border-color: #909090;
    }

    &:active {
        background-color: rgba(88, 88, 88, 0.7);
    }
    
    &:focus {
        outline: none;
    }
    
    &:disabled {
        opacity: 0.4;
    }
    
    ${props => props.square && css`
        width: 25px;
    `}
`;