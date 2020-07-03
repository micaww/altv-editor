import React from 'react';
import ReactDOM from 'react-dom';
import MonacoEditor from 'react-monaco-editor';
import { Rnd } from 'react-rnd';
import styled, { css, createGlobalStyle } from 'styled-components';
import rpc from 'altv-rpc';
import { SpacedContainer, Button } from './components/shared.js';
import OpenDialog from './components/OpenDialog.js';
import SaveDialog from './components/SaveDialog.js';

rpc.init('altv-editor');

const CONTEXT_SERVER = 0;
const CONTEXT_CLIENT = 1;

const GlobalStyle = createGlobalStyle`
    html, body {
        padding: 0;
        margin: 0;
        width: 100%;
        height: 100%;
        font-family: Arial, serif;
        overflow: hidden;
        user-select: none;
    }
    
    * {
        box-sizing: border-box;
    }
    
    .resize {
        z-index: 2;
        margin: 10px;
        background: url(/handle.png) no-repeat;
    }
    
    .hide {
        display: none;
    }
`;
const Container = styled.div`
    position: relative;
    display: ${props => props.visible ? 'flex' : 'none'};
    flex-direction: column;
    align-items: stretch;
    padding: 0;
    width: 100%;
    height: 100%;
    background: #252525;
    border-radius: 4px;
    overflow: hidden;
`;
const Toolbar = styled(SpacedContainer)`
    flex: 0 0 35px;
    z-index: 1;
    border-bottom: 1px solid #393939;
    padding: 3px;
    
    ${Button} {
        height: 25px;
        margin: 2px;
    }
`;
const Tabs = styled.div`
    position: relative;
    z-index: 1;
    box-shadow: 0 1px 8px 0 rgba(0,0,0,0.7);
    font-size: 0;
    height: 30px;
`;
const Tab = styled.div`
    display: inline-block;
    margin: 0;
    padding: 8px 10px 5px;
    border-bottom: 1px solid #393939;
    font-size: 15px;
    background: #2d2d2d;
    
    > span {
        color: #888888;
        pointer-events: none;
        
        ${props => props.unsaved && css`
            &:after {
                content: '*';
            }
        `}
    }
    
    > a {
        text-decoration: none;
        color: #e8e8e8;
        margin-left: 3px;
    }

    ${props => props.active && css`
        border-bottom: none;
        background: #1e1e1e;

        &:not(:first-of-type) {
            border-left: 1px solid #393939;
        }

        &:not(:last-of-type) {
            border-right: 1px solid #393939;
        }

        > span {
            color: #e8e8e8;
        }
    `}
`;
const EditorContainer = styled.div`
    flex: 1;
    margin: 0;
    z-index: 0;
    overflow: hidden;
`;
const StatusBar = styled(SpacedContainer)`
    flex: 0 0 25px;
    box-shadow: 0 -1px 8px 0 rgba(0, 0, 0, 0.7);
    z-index: 1;
    padding: 0 30px 0 10px;
    align-items: center;
    color: #e8e8e8;
    font-size: 12px;
`;

const defES5 = fetchFile('defs/lib.es5.d.ts');
const defBase = fetchFile('defs/base.d.ts');

class App extends React.Component {
    state = {
        visible: false,
        cursorLineNumber: 1,
        cursorColumn: 1,
        status: 'Loading...',
        context: CONTEXT_SERVER,
        tabs: [],
        selectedTab: -1,
        access: false,
        showOpenDialog: false,
        showSaveDialog: false,
        showSaveAsDialog: false
    };
    containerRef = React.createRef();

    componentDidMount(){
        this.containerRef.current.addEventListener('click', this.onContainerClick);
        rpc.register('setAccess', this.onSetAccess);
        rpc.on('focus', this.focus);
        rpc.on('setVisible', this.setVisible);
    }

    componentWillUnmount(){
        this.containerRef.current.removeEventListener('click', this.onContainerClick);
        rpc.unregister('setAccess');
        rpc.off('focus', this.focus);
    }

    componentDidUpdate(_, prevState){
        // handle tab changes
        if(this.editor && (prevState.selectedTab !== this.state.selectedTab || prevState.tabs !== this.state.tabs)){
            const tab = this.state.tabs[this.state.selectedTab];
            if(tab){
                this.editor.setModel(tab.model);
                if(tab.viewState) this.editor.restoreViewState(tab.viewState);
            }
            this.editor.focus();
            this.updateCursorPosition();
        }

        // handle visibility change
        if (this.state.visible && !prevState.visible) {
            this.editor.layout();
            this.editor.focus();
        }
    }

    setVisible = visible => this.setState({ visible });

    onSetAccess = access => this.setState({ access });

    onContainerClick = () => {
        if(!this.state.showOpenDialog && !this.state.showSaveDialog && !this.state.showSaveAsDialog) this.focus();
    };

    onResize = () => {
        if(this.editor) this.editor.layout();
    };

    editorWillMount = (monaco) => {
        this.monaco = monaco;
        monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
            noSemanticValidation: true,
            noSyntaxValidation: false
        });
        monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
            target: monaco.languages.typescript.ScriptTarget.ES2015,
            noLib: true,
            allowNonTsExtensions: true
        });
        defES5.then(text => monaco.languages.typescript.javascriptDefaults.addExtraLib(text, 'defs/lib.es5.d.ts'));
        defBase.then(text => monaco.languages.typescript.javascriptDefaults.addExtraLib(text, 'defs/base.d.ts'));
    };

    editorDidMount = editor => {
        this.editor = editor;

        // line number, column
        editor.onDidChangeCursorPosition(this.updateCursorPosition);

        // set default context
        this.setContext(this.state.context);

        editor.addAction({
            id: 'runSelectionLocally',
            label: 'Run Selection Locally',
            precondition: 'editorHasSelection',
            keybindingContext: null,
            contextMenuGroupId: 'runSelection',
            contextMenuOrder: 0,
            run: e => this.evalLocal(e.getModel().getValueInRange(e.getSelection()))
        });
        editor.addAction({
            id: 'runSelectionServer',
            label: 'Run Selection on Server',
            precondition: 'editorHasSelection',
            keybindingContext: null,
            contextMenuGroupId: 'runSelection',
            contextMenuOrder: 0,
            run: e => this.evalServer(e.getModel().getValueInRange(e.getSelection()))
        });
        editor.addAction({
            id: 'runSelectionAllClients',
            label: 'Run Selection on All Clients',
            precondition: 'editorHasSelection',
            keybindingContext: null,
            contextMenuGroupId: 'runSelection',
            contextMenuOrder: 0,
            run: e => this.evalClients(e.getModel().getValueInRange(e.getSelection()))
        });

        // create first tab
        this.fileNew();

        rpc.triggerClient('loaded');
    };

    updateCursorPosition = () => {
        if(!this.editor) return;
        const pos = this.editor.getPosition();
        this.setState({
            cursorLineNumber: pos.lineNumber,
            cursorColumn: pos.column
        });
    };

    showOpenDialog = () => {
        document.activeElement.blur();
        this.setState({
            showOpenDialog: true
        });
    };
    hideOpenDialog = () => {
        this.setState({
            showOpenDialog: false
        });
        if(this.editor) this.editor.focus();
    };
    showSaveDialog = () => {
        document.activeElement.blur();
        this.setState({
            showSaveDialog: true
        });
    };
    hideSaveDialog = () => {
        this.setState({
            showSaveDialog: false
        });
        if(this.editor) this.editor.focus();
    };
    showSaveAsDialog = () => {
        document.activeElement.blur();
        this.setState({
            showSaveAsDialog: true
        });
    };
    hideSaveAsDialog = () => {
        this.setState({
            showSaveAsDialog: false
        });
        if(this.editor) this.editor.focus();
    };

    onClickSave = () => {
        const tab = this.state.tabs[this.state.selectedTab];
        if(tab.savedValue === null){
            // new file: we need a name
            this.showSaveDialog();
        }else{
            // existing file: overwrite
            this.saveTab(tab, tab.name, false);
        }
    };

    onOpenDialogSubmit = name => {
        rpc.callClient('getFile', name).then(code => {
            const tab = this.state.tabs[this.state.selectedTab];
            if(tab.savedValue === null && !tab.model.getValue().length){
                // this is a blank, unsaved tab. overwrite it.
                this.updateTab(tab, {
                    name,
                    savedValue: code
                });
                tab.model.setValue(code);
            }else{
                // create a new tab
                this.newTab(name, code, false);
            }
            this.hideOpenDialog();
        }).catch(() => {
            alert("Couldn't open file"); // TODO: no alerts pls
        });
    };

    onSaveDialogSubmit = (name, shouldSaveAs) => {
        if(!name.length) return;
        rpc.callClient('exists', name).then(exists => {
            if(exists) return alert("This file already exists"); // TODO: no alerts pls
            this.saveTab(this.state.tabs[this.state.selectedTab], name, shouldSaveAs).then(() => {
                this.hideSaveDialog();
                this.hideSaveAsDialog();
            });
        });
    };

    newTab = (name, value, isFresh) => {
        if(!this.monaco) return;
        const newTabs = [...this.state.tabs, {
            name,
            savedValue: isFresh ? null : value,
            model: this.monaco.editor.createModel(value, 'javascript'),
            viewState: null,
        }];
        this.setState({ tabs: newTabs });
        this.selectTab(newTabs.length - 1);
    };

    updateTab = (tab, changes) => {
        this.setState(prevState => ({
            tabs: prevState.tabs.map(t => t === tab ? { ...t, ...changes } : t)
        }));
    };

    // save - save the file, overwriting the existing one. and set the tab to reference that file
    // save as - save the file as another name, but dont set the tab to reference that file
    saveTab = (tab, name, shouldSaveAs) => {
        this.setStatus('Saving...');
        const val = tab.model.getValue();
        return rpc.callClient('saveFile', [name, val]).then(() => {
            if(!shouldSaveAs){
                this.updateTab(tab, {
                    name,
                    savedValue: val
                });
            }
            this.setStatus(null);
        }).catch(() => {
            alert("Couldn't save file"); // TODO: no alerts pls
        });
    };

    fileNew = () => this.newTab('New', '', true);

    selectTab = idx => {
        // save current tab state, then set new selectedTab
        if(!this.editor) return;
        this.setState(prevState => {
            const selectedTab = prevState.tabs[prevState.selectedTab];
            let tabs = prevState.tabs;
            if(selectedTab){
                tabs = prevState.tabs.map((tab, curIdx) => {
                    if(curIdx === prevState.selectedTab) tab.viewState = this.editor.saveViewState();
                    return tab;
                });
            }
            return {
                selectedTab: idx,
                tabs
            };
        });
    };

    closeTab = idx => {
        // close and dispose of current tab, then set new selectedTab
        this.setState(prevState => {
            const tab = prevState.tabs[idx];
            if(tab.model) tab.model.dispose();
            const oldSelected = prevState.selectedTab;
            const newSelected = oldSelected === 0 ? oldSelected : oldSelected - 1;
            const newTabs = [...prevState.tabs];
            newTabs.splice(idx, 1);
            return {
                selectedTab: newSelected,
                tabs: newTabs
            };
        });
    };

    setStatus = status => this.setState({ status });

    setContext = async context => {
        if(!this.monaco) return;
        this.setState({ context });
        if(context === CONTEXT_SERVER){
            if(this.csDefDisposable){
                this.csDefDisposable.dispose();
                this.csDefDisposable = undefined;
            }
            this.setStatus("Loading Server-side Definitions...");
            let data = this.ssDefContent;
            if(typeof data === "undefined"){
                try {
                    data = await fetchFile('https://raw.githubusercontent.com/CocaColaBear/types-ragemp-s/master/index.d.ts');
                }catch(e){
                    data = await fetchFile('defs/rage-server.d.ts');
                }
            }
            this.ssDefContent = data;
            this.ssDefDisposable = monaco.languages.typescript.javascriptDefaults.addExtraLib(data);
        }else if(context === CONTEXT_CLIENT){
            if(this.ssDefDisposable){
                this.ssDefDisposable.dispose();
                this.ssDefDisposable = undefined;
            }
            this.setStatus("Loading Client-side Definitions...");
            let data = this.csDefContent;
            if(typeof data === "undefined"){
                try {
                    data = await fetchFile('https://raw.githubusercontent.com/CocaColaBear/types-ragemp-c/master/index.d.ts');
                }catch(e){
                    data = await fetchFile('/defs/rage-client.d.ts');
                }
            }
            this.csDefContent = data;
            this.csDefDisposable = monaco.languages.typescript.javascriptDefaults.addExtraLib(data);
        }
        this.setStatus(null);
    };

    onClickContext = () => {
        this.setContext(this.state.context === CONTEXT_CLIENT ? CONTEXT_SERVER : CONTEXT_CLIENT);
    };

    evalLocal = code => {
        if(typeof code !== "string") code = this.getCurrentValue();

        this.setStatus('Running Locally...');
        rpc.callClient('eval', code).finally(() => {
            this.setStatus(null);
        });
    };

    evalServer = code => {
        if(typeof code !== "string") code = this.getCurrentValue();

        this.setStatus('Running on Server...');
        rpc.callServer('eval', code).finally(() => {
            this.setStatus(null);
        });
    };

    evalClients = code => {
        if(typeof code !== "string") code = this.getCurrentValue();

        this.setStatus('Running on All Clients...');
        rpc.callServer('evalClients', code).finally(() => {
            this.setStatus(null);
        });
    };

    getCurrentValue = () => this.state.tabs[this.state.selectedTab].model.getValue();

    focus = () => this.editor && !this.editor.hasTextFocus() && this.editor.focus();

    render(){
        return (
            <React.Fragment>
                <Rnd onResize={this.onResize}
                    default={{
                        x: (window.innerWidth * 0.3)/2,
                        y: 50,
                        width: '70%',
                        height: 700
                    }}
                    minWidth={500}
                    minHeight={200}
                    dragHandleClassName="handle"
                    cancel="button"
                    resizeHandleClasses={{
                        bottomRight: this.state.visible ? "resize" : "hide"
                    }}
                    enableResizing={{
                        bottom: false,
                        bottomLeft: false,
                        bottomRight: true,
                        left: false,
                        right: false,
                        top: false,
                        topLeft: false,
                        topRight: false
                    }}
                    bounds="body">
                    <Container ref={this.containerRef} visible={this.state.visible}>
                        <Toolbar className="handle">
                            <div>
                                <Button onClick={this.fileNew}>New</Button>
                                <Button onClick={this.showOpenDialog}>Open</Button>
                                <Button onClick={this.onClickSave}>Save</Button>
                                <Button onClick={this.showSaveAsDialog}>Save As</Button>
                            </div>
                            <div>
                                <Button square title="Run Locally" onClick={this.evalLocal} disabled={!(this.state.access === true || this.state.access.l)}>L</Button>
                                <Button square title="Run on Server" onClick={this.evalServer} disabled={!(this.state.access === true || this.state.access.s)}>S</Button>
                                <Button square title="Run on All Clients" onClick={this.evalClients} disabled={!(this.state.access === true || this.state.access.c)}>C</Button>
                                <Button title={`Use ${this.state.context === CONTEXT_CLIENT ? 'Server-side' : 'Client-side'} Context`} onClick={this.onClickContext}>{this.state.context === CONTEXT_CLIENT ? "Client-side" : "Server-side"}</Button>
                            </div>
                        </Toolbar>
                        <Tabs>
                            {this.state.tabs.map((tab, idx) => {
                                const selected = this.state.selectedTab === idx;
                                return (
                                    <Tab
                                        key={idx}
                                        active={selected}
                                        unsaved={tab.savedValue === null || tab.savedValue !== tab.model.getValue()}
                                        onClick={e => {
                                            e.preventDefault();
                                            this.selectTab(idx);
                                        }}>
                                        <span>{tab.name}</span>
                                        {selected && this.state.tabs.length > 1 && (
                                            <a
                                                href="#"
                                                onClick={e => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    this.closeTab(idx);
                                                }}>
                                                &times;
                                            </a>
                                        )}
                                    </Tab>
                                )
                            })}
                        </Tabs>
                        <EditorContainer>
                            <MonacoEditor
                                language="javascript"
                                theme="vs-dark"
                                editorWillMount={this.editorWillMount}
                                editorDidMount={this.editorDidMount}
                                options={{
                                    fontSize: 16,
                                    links: false,
                                    scrollBeyondLastLine: false,
                                    model: null
                                }} />
                        </EditorContainer>
                        <StatusBar>
                            <span>Line {this.state.cursorLineNumber}, Column {this.state.cursorColumn}</span>
                            <span>{this.state.status}</span>
                        </StatusBar>
                        {this.state.showOpenDialog && (
                            <OpenDialog
                                tabs={this.state.tabs}
                                hide={this.hideOpenDialog}
                                onFileSelected={this.onOpenDialogSubmit}/>
                        )}
                        {this.state.showSaveDialog && (
                            <SaveDialog
                                hide={this.hideSaveDialog}
                                onSubmit={name => this.onSaveDialogSubmit(name, false)}/>
                        )}
                        {this.state.showSaveAsDialog && (
                            <SaveDialog
                                hide={this.hideSaveAsDialog}
                                onSubmit={name => this.onSaveDialogSubmit(name, true)}/>
                        )}
                    </Container>
                </Rnd>
                <GlobalStyle/>
            </React.Fragment>
        );
    }
}

function fetchFile(url){
    return fetch(url).then(res => res.text());
}

ReactDOM.render(<App />, document.getElementById('root'));