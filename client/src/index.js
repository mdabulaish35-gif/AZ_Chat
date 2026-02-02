import * as process from 'process';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Ye line ab imports ke neeche hai, isliye error nahi aayega
window.process = process;

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
    <App /> 
);