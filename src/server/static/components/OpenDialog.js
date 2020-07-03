import React from 'react';
import styled, { css } from 'styled-components';
import rpc from 'altv-rpc';

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
    width: 280px;
`;
const List = styled.ul`
    background: #111111;
    border-radius: 4px;
    width: 100%;
    min-height: 120px;
    max-height: 360px;
    overflow-x: hidden;
    overflow-y: auto;
    margin: 0;
    list-style-type: none;
    padding: 0;
`;
const StyledListItem = styled.li`
    > a {
        padding: 2px 5px;
        display: block;
        text-decoration: none;
        color: #e9e9e9;
    }
    
    ${props => props.active && css`
        background: rgba(217, 217, 217, 0.29);
    `}
`;
const StyledButton = styled(Button)`
    margin-top: 8px;
    border: 1px solid #4e4e4e;
    padding: 5px 10px;
`;

export default class OpenDialog extends React.Component {
    state = {
        files: null,
        selectedFile: null
    };

    componentDidMount(){
        rpc.callClient('getFiles').then(files => {
            const newFiles = files.filter(name => !this.props.tabs.find(t => t.name === name));
            this.setState({
                files: newFiles,
                selectedFile: newFiles[0]
            });
        });
    }

    onBackdropClick = e => {
        if(e.target === e.currentTarget) this.props.hide();
    };

    onFileClick = file => {
        this.setState(prevState => {
            if(prevState.selectedFile === file) this.props.onFileSelected(file);
            else return { selectedFile: file };
            return {};
        });
    };

    delete = () => {
        if(!this.state.selectedFile) return;
        rpc.callClient('deleteFile', this.state.selectedFile).then(() => {
            this.setState(prevState => {
                const newFiles = prevState.files.filter(f => f !== this.state.selectedFile);
                return {
                    files: newFiles,
                    selectedFile: newFiles[0]
                };
            });
        }).catch(() => {
            alert("Couldn't delete file"); // TODO: no alerts pls
        });
    };

    open = () => this.state.selectedFile && this.props.onFileSelected(this.state.selectedFile);

    render(){
        return (
            <Backdrop onClick={this.onBackdropClick}>
                {!!this.state.files && (
                    <Dialog>
                        <List>
                            {this.state.files.map(file => (
                                <ListItem
                                    key={file}
                                    active={this.state.selectedFile === file}
                                    onClick={() => this.onFileClick(file)}
                                >{file}</ListItem>
                            ))}
                        </List>
                        <SpacedContainer>
                            <div>
                                <StyledButton onClick={this.props.hide}>Close</StyledButton>
                                <StyledButton disabled={!this.state.selectedFile} onClick={this.delete} marginLeft={6}>Delete</StyledButton>
                            </div>
                            <StyledButton disabled={!this.state.selectedFile} onClick={this.open}>Open</StyledButton>
                        </SpacedContainer>
                    </Dialog>
                )}
            </Backdrop>
        );
    }
}

function ListItem({ children, active, onClick }){
    return (
        <StyledListItem active={active}>
            <a href="#" onClick={onClick}>{children}</a>
        </StyledListItem>
    );
}