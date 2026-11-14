import {createRoot} from 'react-dom/client';
import {Component,type ReactNode} from 'react';
import App from './App';
import './styles.css';
import './dailyUse.css';
class ErrorBoundary extends Component<{children:ReactNode},{error:string}>{state={error:''};static getDerivedStateFromError(e:Error){return {error:e.message};}render(){return this.state.error?<div className="boot"><h1>页面暂时遇到了问题</h1><p>{this.state.error}</p><p>已保存的学习记录仍在本机。</p><button className="primary" onClick={()=>location.reload()}>重新打开</button></div>:this.props.children;}}
createRoot(document.getElementById('root')!).render(<ErrorBoundary><App/></ErrorBoundary>);
