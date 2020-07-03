import React, { useState } from 'react';
import styled from 'styled-components';

import { Button, SpacedContainer } from './shared.js';

const Backdrop = styled.div`
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.3);
    z-index: 3;
`;
const Dialog = styled.div`
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    border-radius: 4px;
    background: #2d2d2d;
    padding: 10px;
    color: #ffffff;
    box-shadow: 0 0 6px 3px rgba(0, 0, 0, 0.3);
    width: 250px;
`;
const Input = styled.input`
    font-size: 16px;
    border-radius: 4px;
    border: 1px solid #393939;
    padding: 5px;
    width: 100%;
    background: #111;
    color: #fff;
    
    &:focus {
        border-color: #909090;
        outline: none;
    }
    
    &::placeholder {
        color: #909090;
    }
`;
const StyledButton = styled(Button)`
    margin-top: 8px;
    border: 1px solid #4e4e4e;
    padding: 5px 10px;
`;

export default function SaveDialog({ hide, onSubmit }){
    const [name, setName] = useState('');

    function onBackdropClick(e){
        if(e.target === e.currentTarget){
            hide();
        }
    }

    return (
        <Backdrop onClick={onBackdropClick}>
            <Dialog>
                <Input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="File Name"
                    autoFocus/>
                <SpacedContainer>
                    <StyledButton onClick={hide}>Close</StyledButton>
                    <StyledButton onClick={() => onSubmit(name)} disabled={!name.length}>Save</StyledButton>
                </SpacedContainer>
            </Dialog>
        </Backdrop>
    );
}