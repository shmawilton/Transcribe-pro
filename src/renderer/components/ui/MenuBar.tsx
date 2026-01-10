// MenuBar.tsx - Julius - Week 3
// Menu bar component with dropdown menus and icons

import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../../store/store';
import { useAudioEngine } from '../audio/useAudioEngine';
import { pickAudioFile, validateAudioFile } from '../audio/audioFilePicker';

// Kenyan colors
const KENYAN_RED = '#DE2910';
const KENYAN_GREEN = '#006644';

// Handwritten font family - Merienda from Google Fonts
const HANDWRITTEN_FONT = "'Merienda', 'Caveat', cursive";

// SVG Icon Components
const FileIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
    <path d="M2 2a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l4.414 4.414a1 1 0 0 1 .293.707V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2zm10.586 0H4v12h8V6.5h-3.5A.5.5 0 0 1 8 6V2.414z"/>
  </svg>
);

const EditIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
    <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l10-10zM11.207 2.5L13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293l6.5-6.5zm-9.761 5.175l-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325z"/>
  </svg>
);

const ViewIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
    <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8zM1.173 8a13.133 13.133 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.133 13.133 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5c-2.12 0-3.879-1.168-5.168-2.457A13.134 13.134 0 0 1 1.172 8z"/>
    <path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0z"/>
  </svg>
);

const WindowIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
    <path d="M2.5 4a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1zm2-.5a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0zm1 .5a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1z"/>
    <path d="M2 2a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H2zm12 1a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h12z"/>
  </svg>
);

const HelpIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
    <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
    <path d="M5.255 5.786a.237.237 0 0 0 .241.247h.825c.138 0 .248-.113.266-.25.09-.656.54-1.134 1.342-1.134.686 0 1.314.343 1.314 1.168 0 .635-.374.927-.965 1.371-.673.489-1.206 1.06-1.168 1.987l.003.217a.25.25 0 0 0 .25.246h.811a.25.25 0 0 0 .25-.25v-.105c0-.718.273-.927 1.01-1.486.609-.463 1.244-.977 1.244-2.056 0-1.511-1.276-2.241-2.673-2.241-1.326 0-2.786.647-2.754 2.533zm1.25 4.331c0 .18.013.357.03.52h.819c-.02-.163-.03-.34-.03-.52 0-.211.01-.423.03-.624H6.3c.02.2.03.413.03.624z"/>
  </svg>
);

const UndoIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <path fillRule="evenodd" d="M8 3a5 5 0 1 1-4.546 2.914.5.5 0 0 0-.908-.417A6 6 0 1 0 8 2v1z"/>
    <path d="M8 4.466V.534a.25.25 0 0 0-.41-.192L5.23 2.308a.25.25 0 0 0 0 .384l2.36 1.966A.25.25 0 0 0 8 4.466z"/>
  </svg>
);

const RedoIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <path fillRule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
    <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966a.25.25 0 0 1 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/>
  </svg>
);

const SettingsIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492zM5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0z"/>
    <path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52l-.094-.319zm-2.633.283c.246-.835 1.428-.835 1.674 0l.094.319a1.873 1.873 0 0 0 2.693 1.115l.292-.16c.764-.415 1.6.42 1.184 1.185l-.159.292a1.873 1.873 0 0 0 1.116 2.692l.318.094c.835.246.835 1.428 0 1.674l-.319.094a1.873 1.873 0 0 0-1.115 2.693l.16.292c.415.764-.42 1.6-1.185 1.184l-.292-.159a1.873 1.873 0 0 0-2.692 1.116l-.094.318c-.246.835-1.428.835-1.674 0l-.094-.319a1.873 1.873 0 0 0-2.693-1.115l-.292.16c-.764.415-1.6-.42-1.184-1.185l.159-.292A1.873 1.873 0 0 0 1.945 8.93l-.319-.094c-.835-.246-.835-1.428 0-1.674l.319-.094A1.873 1.873 0 0 0 3.06 4.377l-.16-.292c-.415-.764.42-1.6 1.185-1.184l.292.159a1.873 1.873 0 0 0 2.692-1.115l.094-.319z"/>
  </svg>
);

const ThemeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <path d="M8 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6zm0 1a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM8 0a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 0zm0 13a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 13zm8-5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2a.5.5 0 0 1 .5.5zM3 8a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2A.5.5 0 0 1 3 8zm13.657-5.657a.5.5 0 0 1 0 .707l-1.414 1.414a.5.5 0 1 1-.707-.707l1.414-1.414a.5.5 0 0 1 .707 0zm-11.314 11.314a.5.5 0 0 1 0 .707l-1.414 1.414a.5.5 0 1 1-.707-.707l1.414-1.414a.5.5 0 0 1 .707 0zm11.314 0a.5.5 0 0 1-.707 0l-1.414-1.414a.5.5 0 0 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .707zM4.464 4.465a.5.5 0 0 1-.707 0L2.343 3.05a.5.5 0 1 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .708z"/>
  </svg>
);

const MoonIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <path d="M6 .278a.768.768 0 0 1 .08.858 7.208 7.208 0 0 0-.878 3.46c0 4.021 3.278 7.277 7.318 7.277.527 0 1.04-.055 1.533-.16a.787.787 0 0 1 .81.316.733.733 0 0 1-.031.893A8.349 8.349 0 0 1 8.344 16C3.734 16 0 12.286 0 7.71 0 4.266 2.114 1.312 5.124.06A.752.752 0 0 1 6 .278z"/>
  </svg>
);

// Dropdown menu icons
const FolderOpenIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
    <path d="M1 3.5A1.5 1.5 0 0 1 2.5 2h2.764c.958 0 1.76.56 2.311 1.184C7.985 3.648 8.48 4 9 4h4.5A1.5 1.5 0 0 1 15 5.5v.64c.57.265.94.876.856 1.546l-.64 5.124A2.5 2.5 0 0 1 12.733 15H3.266a2.5 2.5 0 0 1-2.481-2.19l-.64-5.124A1.5 1.5 0 0 1 1 6.14V3.5zM2 6h12v-.5a.5.5 0 0 0-.5-.5H9c-.964 0-1.71-.629-2.174-1.154C6.374 3.334 5.82 3 5.264 3H2.5a.5.5 0 0 0-.5.5V6zm-.367 1a.5.5 0 0 0-.496.562l.64 5.124A1.5 1.5 0 0 0 3.266 14h9.468a1.5 1.5 0 0 0 1.489-1.314l.64-5.124A.5.5 0 0 0 14.367 7H1.633z"/>
  </svg>
);

const CloseIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
    <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854z"/>
  </svg>
);

const ExitIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
    <path fillRule="evenodd" d="M10 12.5a.5.5 0 0 1-.5.5h-8a.5.5 0 0 1-.5-.5v-9a.5.5 0 0 1 .5-.5h8a.5.5 0 0 1 .5.5v2a.5.5 0 0 0 1 0v-2A1.5 1.5 0 0 0 9.5 2h-8A1.5 1.5 0 0 0 0 3.5v9A1.5 1.5 0 0 0 1.5 14h8a1.5 1.5 0 0 0 1.5-1.5v-2a.5.5 0 0 0-1 0v2z"/>
    <path fillRule="evenodd" d="M15.854 8.354a.5.5 0 0 0 0-.708l-3-3a.5.5 0 0 0-.708.708L14.293 7.5H5.5a.5.5 0 0 0 0 1h8.793l-2.147 2.146a.5.5 0 0 0 .708.708l3-3z"/>
  </svg>
);

const CopyIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
    <path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/>
    <path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/>
  </svg>
);

const ScissorsIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
    <path d="M3.5 3.5c-.614-.884-.074-1.962.858-2.5L8 7.226 11.642 1c.932.538 1.472 1.616.858 2.5L8.81 8.61l1.556 2.661a2.5 2.5 0 1 1-.794.637L8 9.73l-1.572 2.177a2.5 2.5 0 1 1-.794-.637L7.19 8.61 3.5 3.5zm2.5 10a1.5 1.5 0 1 0-3 0 1.5 1.5 0 0 0 3 0zm7 0a1.5 1.5 0 1 0-3 0 1.5 1.5 0 0 0 3 0z"/>
  </svg>
);

const ClipboardIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
    <path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/>
    <path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/>
  </svg>
);

const ZoomInIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
    <path fillRule="evenodd" d="M6.5 12a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11zM13 6.5a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0z"/>
    <path d="M10.344 11.742c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1 6.538 6.538 0 0 1-1.398 1.4z"/>
    <path fillRule="evenodd" d="M6.5 3a.5.5 0 0 1 .5.5V6h2.5a.5.5 0 0 1 0 1H7v2.5a.5.5 0 0 1-1 0V7H3.5a.5.5 0 0 1 0-1H6V3.5a.5.5 0 0 1 .5-.5z"/>
  </svg>
);

const ZoomOutIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
    <path fillRule="evenodd" d="M6.5 12a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11zM13 6.5a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0z"/>
    <path d="M10.344 11.742c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1 6.538 6.538 0 0 1-1.398 1.4z"/>
    <path fillRule="evenodd" d="M3 6.5a.5.5 0 0 1 .5-.5h6a.5.5 0 0 1 0 1h-6a.5.5 0 0 1-.5-.5z"/>
  </svg>
);

const FullscreenIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
    <path d="M1.5 1a.5.5 0 0 0-.5.5v4a.5.5 0 0 1-1 0v-4A1.5 1.5 0 0 1 1.5 0h4a.5.5 0 0 1 0 1h-4zM10 .5a.5.5 0 0 1 .5-.5h4A1.5 1.5 0 0 1 16 1.5v4a.5.5 0 0 1-1 0v-4a.5.5 0 0 0-.5-.5h-4a.5.5 0 0 1-.5-.5zM.5 10a.5.5 0 0 1 .5.5v4a.5.5 0 0 0 .5.5h4a.5.5 0 0 1 0 1h-4A1.5 1.5 0 0 1 0 14.5v-4a.5.5 0 0 1 .5-.5zm15 0a.5.5 0 0 1 .5.5v4a1.5 1.5 0 0 1-1.5 1.5h-4a.5.5 0 0 1 0-1h4a.5.5 0 0 0 .5-.5v-4a.5.5 0 0 1 .5-.5z"/>
  </svg>
);

const MinimizeIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
    <path d="M14 8a.5.5 0 0 1-.5.5H2.5a.5.5 0 0 1 0-1h11a.5.5 0 0 1 .5.5z"/>
  </svg>
);

const InfoIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
    <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
    <path d="m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533L8.93 6.588zM9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0z"/>
  </svg>
);

const BookIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
    <path d="M1 2.828c.885-.37 2.154-.769 3.388-.893 1.33-.134 2.458.063 3.112.752v9.746c-.935-.53-2.12-.603-3.213-.493-1.18.12-2.37.461-3.287.811V2.828zm7.5-.141c.654-.689 1.782-.886 3.112-.752 1.234.124 2.503.523 3.388.893v9.923c-.918-.35-2.107-.692-3.287-.81-1.094-.111-2.278-.039-3.213.492V2.687zM8 1.783C7.015.936 5.587.81 4.287.94c-1.514.153-3.042.672-3.994 1.105A.5.5 0 0 0 0 2.5v11a.5.5 0 0 0 .707.455c.882-.4 2.303-.881 3.68-1.02 1.409-.142 2.59.087 3.223.877a.5.5 0 0 0 .78 0c.633-.79 1.814-1.019 3.222-.877 1.378.139 2.8.62 3.681 1.02A.5.5 0 0 0 16 13.5v-11a.5.5 0 0 0-.293-.455c-.952-.433-2.48-.952-3.994-1.105C10.413.809 8.985.936 8 1.783z"/>
  </svg>
);

const CheckIcon = () => (
  <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
    <path d="M12.736 3.97a.733.733 0 0 1 1.047 0c.286.289.29.756.01 1.05L7.88 12.01a.733.733 0 0 1-1.065.02L3.217 8.384a.757.757 0 0 1 0-1.06.733.733 0 0 1 1.047 0l3.052 3.093 5.4-6.425a.247.247 0 0 1 .02-.022z"/>
  </svg>
);

interface DropdownItem {
  id: string;
  label: string;
  icon?: React.FC;
  shortcut?: string;
  action?: () => void;
  divider?: boolean;
  checked?: boolean;
}

const MenuBar: React.FC = () => {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  
  // Store state
  const theme = useAppStore((state) => state.theme);
  const toggleTheme = useAppStore((state) => state.toggleTheme);
  const isLightMode = theme === 'light';
  const openSettingsModal = useAppStore((state) => state.openSettingsModal);
  const openHelpModal = useAppStore((state) => state.openHelpModal);
  
  // Audio engine
  const { loadFile, stop, unloadAudio, isAudioLoaded, resumeAudioContext } = useAudioEngine();
  
  // Project reset
  const resetProject = useAppStore((state) => state.resetProject);
  
  // Zoom controls state
  const zoomLevel = useAppStore((state) => state.ui.zoomLevel);
  const setZoomLevel = useAppStore((state) => state.setZoomLevel);
  const viewportStart = useAppStore((state) => state.ui.viewportStart);
  const viewportEnd = useAppStore((state) => state.ui.viewportEnd);
  const setViewport = useAppStore((state) => state.setViewport);
  const duration = useAppStore((state) => state.audio.duration);
  const currentTime = useAppStore((state) => state.audio.currentTime);
  
  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Initialize theme on mount
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // File menu actions
  const handleLoadAudio = async () => {
    try {
      await resumeAudioContext();
      const file = await pickAudioFile();
      if (!file) return;
      const validation = validateAudioFile(file);
      if (!validation.valid) {
        console.error('Invalid file:', validation.error);
        return;
      }
      await loadFile(file);
      setOpenMenu(null);
    } catch (err) {
      console.error('Failed to load audio:', err);
    }
  };

  const handleCloseAudio = () => {
    console.log('[MenuBar] Closing audio and resetting project');
    // Stop playback
    stop();
    // Unload audio from engine
    unloadAudio();
    // Reset the store to initial state (this will trigger welcome screen)
    resetProject();
    setOpenMenu(null);
  };

  const handleExit = () => {
    console.log('[MenuBar] Exiting application');
    // First stop any playing audio
    stop();
    // Unload audio
    unloadAudio();
    
    // Try to close the window
    if (typeof window !== 'undefined') {
      // Check for Electron API
      if ((window as any).electronAPI?.closeWindow) {
        (window as any).electronAPI.closeWindow();
      } else if ((window as any).electronAPI?.quit) {
        (window as any).electronAPI.quit();
      } else {
        // For web browser, try window.close() - may not work depending on how window was opened
        try {
          window.close();
        } catch (e) {
          console.log('[MenuBar] Cannot close window programmatically in browser');
          // Show a message that the app cannot be closed this way
          alert('Please close this browser tab/window manually.');
        }
      }
    }
  };

  // Zoom handlers
  const handleZoomIn = () => {
    if (duration <= 0) return;
    const newZoom = Math.min(zoomLevel * 1.5, 8);
    setZoomLevel(newZoom);
    const visibleDuration = duration / newZoom;
    const center = currentTime;
    let newStart = Math.max(0, center - visibleDuration / 2);
    let newEnd = newStart + visibleDuration;
    if (newEnd > duration) {
      newEnd = duration;
      newStart = Math.max(0, newEnd - visibleDuration);
    }
    setViewport(newStart, newEnd);
    setOpenMenu(null);
  };

  const handleZoomOut = () => {
    if (duration <= 0) return;
    const newZoom = Math.max(zoomLevel / 1.5, 1);
    setZoomLevel(newZoom);
    if (newZoom === 1) {
      setViewport(0, duration);
    } else {
      const visibleDuration = duration / newZoom;
      const center = (viewportStart + viewportEnd) / 2;
      let newStart = Math.max(0, center - visibleDuration / 2);
      let newEnd = newStart + visibleDuration;
      if (newEnd > duration) {
        newEnd = duration;
        newStart = Math.max(0, newEnd - visibleDuration);
      }
      setViewport(newStart, newEnd);
    }
    setOpenMenu(null);
  };

  const handleZoomReset = () => {
    setZoomLevel(1);
    if (duration > 0) {
      setViewport(0, duration);
    }
    setOpenMenu(null);
  };
  
  // Dynamic colors based on zoom level
  const getZoomColor = () => {
    if (zoomLevel <= 1) return { primary: '#00D4FF', glow: 'rgba(0, 212, 255, 0.4)' };
    if (zoomLevel <= 2) return { primary: '#00FF88', glow: 'rgba(0, 255, 136, 0.4)' };
    if (zoomLevel <= 4) return { primary: '#FFD700', glow: 'rgba(255, 215, 0, 0.4)' };
    return { primary: '#FF6B35', glow: 'rgba(255, 107, 53, 0.4)' };
  };
  const zoomColor = getZoomColor();
  const zoomPercent = ((zoomLevel - 1) / 7) * 100;

  // Menu items with their dropdown content
  const menuItems = [
    { 
      id: 'file', 
      label: 'File', 
      icon: FileIcon, 
      color: KENYAN_RED,
      items: [
        { id: 'open', label: 'Load Audio', icon: FolderOpenIcon, shortcut: 'Ctrl+O', action: handleLoadAudio },
        { id: 'divider1', label: '', divider: true },
        { id: 'close', label: 'Close Audio', icon: CloseIcon, action: handleCloseAudio },
        { id: 'divider2', label: '', divider: true },
        { id: 'exit', label: 'Exit', icon: ExitIcon, shortcut: 'Alt+F4', action: handleExit },
      ] as DropdownItem[]
    },
    { 
      id: 'edit', 
      label: 'Edit', 
      icon: EditIcon, 
      color: 'var(--text-primary)',
      items: [
        { id: 'undo', label: 'Undo', icon: UndoIcon, shortcut: 'Ctrl+Z', action: () => console.log('Undo') },
        { id: 'redo', label: 'Redo', icon: RedoIcon, shortcut: 'Ctrl+Y', action: () => console.log('Redo') },
        { id: 'divider1', label: '', divider: true },
        { id: 'cut', label: 'Cut', icon: ScissorsIcon, shortcut: 'Ctrl+X', action: () => console.log('Cut') },
        { id: 'copy', label: 'Copy', icon: CopyIcon, shortcut: 'Ctrl+C', action: () => console.log('Copy') },
        { id: 'paste', label: 'Paste', icon: ClipboardIcon, shortcut: 'Ctrl+V', action: () => console.log('Paste') },
      ] as DropdownItem[]
    },
    { 
      id: 'view', 
      label: 'View', 
      icon: ViewIcon, 
      color: 'var(--text-primary)',
      items: [
        { id: 'theme', label: isLightMode ? 'Dark Mode' : 'Light Mode', icon: isLightMode ? MoonIcon : ThemeIcon, action: () => { toggleTheme(); setOpenMenu(null); }, checked: isLightMode },
        { id: 'divider1', label: '', divider: true },
        { id: 'zoomin', label: 'Zoom In', icon: ZoomInIcon, shortcut: 'Ctrl++', action: handleZoomIn },
        { id: 'zoomout', label: 'Zoom Out', icon: ZoomOutIcon, shortcut: 'Ctrl+-', action: handleZoomOut },
        { id: 'zoomreset', label: 'Reset Zoom', shortcut: 'Ctrl+0', action: handleZoomReset },
      ] as DropdownItem[]
    },
    { 
      id: 'window', 
      label: 'Window', 
      icon: WindowIcon, 
      color: 'var(--text-primary)',
      items: [
        { id: 'fullscreen', label: 'Fullscreen', icon: FullscreenIcon, shortcut: 'F11', action: () => document.documentElement.requestFullscreen?.() },
        { id: 'minimize', label: 'Minimize', icon: MinimizeIcon, action: () => window.electronAPI?.minimizeWindow?.() },
      ] as DropdownItem[]
    },
    { 
      id: 'help', 
      label: 'Help', 
      icon: HelpIcon, 
      color: KENYAN_GREEN,
      items: [
        { id: 'docs', label: 'Documentation', icon: BookIcon, shortcut: 'F1', action: () => { openHelpModal(); setOpenMenu(null); } },
        { id: 'divider1', label: '', divider: true },
        { id: 'about', label: 'About', icon: InfoIcon, action: () => { openSettingsModal(); setOpenMenu(null); } },
      ] as DropdownItem[]
    },
  ];

  const iconButtons = [
    { id: 'undo', icon: UndoIcon, label: 'Undo', action: () => console.log('Undo') },
    { id: 'redo', icon: RedoIcon, label: 'Redo', action: () => console.log('Redo') },
    { id: 'settings', icon: SettingsIcon, label: 'Settings', action: () => openSettingsModal() },
    { id: 'theme', icon: isLightMode ? MoonIcon : ThemeIcon, label: isLightMode ? 'Dark Mode' : 'Light Mode', action: () => toggleTheme() },
  ];

  // Theme-aware colors
  const menuBg = isLightMode ? 'rgba(255, 255, 255, 0.95)' : 'rgba(26, 26, 26, 0.95)';
  const textColor = isLightMode ? '#1a1a1a' : '#ffffff';
  const hoverBg = isLightMode ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.1)';
  const borderColor = isLightMode ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)';

  return (
    <div 
      ref={menuRef}
      className="menu-bar" 
      style={{ 
        display: 'flex', 
        width: '100%',
        alignItems: 'center',
        height: '100%',
        gap: '1rem',
        justifyContent: 'space-between',
        position: 'relative',
        padding: '0 1.5rem',
        background: isLightMode ? 'rgba(255, 255, 255, 0.8)' : 'rgba(26, 26, 26, 0.5)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderBottom: `1px solid ${borderColor}`,
        fontFamily: HANDWRITTEN_FONT
      }}
    >
      {/* Left side - Menu items */}
      <div style={{ 
        display: 'flex', 
        gap: '0.25rem', 
        flex: 1,
        justifyContent: 'flex-start',
        alignItems: 'center'
      }}>
        {menuItems.map((item) => {
          const IconComponent = item.icon;
          const isOpen = openMenu === item.id;
          const isHovered = hoveredItem === item.id;
          return (
            <div key={item.id} style={{ position: 'relative' }}>
              <button
                className="menu-bar-button"
                style={{
                  padding: '0.4rem 0.9rem',
                  height: '2rem',
                  background: isOpen ? hoverBg : 'transparent',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  color: isOpen ? item.color : textColor,
                  fontFamily: HANDWRITTEN_FONT,
                  fontSize: '1rem',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                }}
                onMouseEnter={() => {
                  setHoveredItem(item.id);
                  if (openMenu && openMenu !== item.id) {
                    setOpenMenu(item.id);
                  }
                }}
                onMouseLeave={() => setHoveredItem(null)}
                onClick={() => setOpenMenu(isOpen ? null : item.id)}
              >
                {/* Animated bottom border */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    width: isOpen || isHovered ? '100%' : '0%',
                    height: '2px',
                    background: item.color,
                    transition: 'width 0.2s ease',
                  }}
                />
                
                <span style={{ 
                  position: 'relative', 
                  zIndex: 2,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}>
                  <IconComponent />
                  {item.label}
                </span>
              </button>

              {/* Dropdown Menu */}
              {isOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    minWidth: '200px',
                    background: menuBg,
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    border: `1px solid ${borderColor}`,
                    borderRadius: '8px',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                    padding: '4px',
                    zIndex: 1000,
                    animation: 'dropdownFadeIn 0.15s ease-out',
                  }}
                >
                  {item.items.map((dropItem) => {
                    if (dropItem.divider) {
                      return (
                        <div
                          key={dropItem.id}
                          style={{
                            height: '1px',
                            background: borderColor,
                            margin: '4px 8px',
                          }}
                        />
                      );
                    }
                    const DropIcon = dropItem.icon;
                    return (
                      <button
                        key={dropItem.id}
                        onClick={dropItem.action}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          background: 'transparent',
                          border: 'none',
                          borderRadius: '4px',
                          color: textColor,
                          fontFamily: HANDWRITTEN_FONT,
                          fontSize: '0.95rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '12px',
                          transition: 'background 0.15s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = hoverBg;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent';
                        }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {DropIcon && <DropIcon />}
                          {dropItem.label}
                          {dropItem.checked && (
                            <span style={{ marginLeft: '4px', color: KENYAN_GREEN }}>
                              <CheckIcon />
                            </span>
                          )}
                        </span>
                        {dropItem.shortcut && (
                          <span style={{ 
                            fontSize: '0.75rem', 
                            opacity: 0.5,
                            fontFamily: 'monospace'
                          }}>
                            {dropItem.shortcut}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Center - Zoom Controls */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          background: isLightMode ? 'rgba(0, 0, 0, 0.05)' : 'rgba(15, 15, 15, 0.8)',
          padding: '4px 12px',
          borderRadius: '24px',
          border: `1px solid ${zoomColor.primary}30`,
          boxShadow: `0 2px 12px rgba(0, 0, 0, 0.2), 0 0 16px ${zoomColor.glow}`,
          transition: 'all 0.3s ease',
        }}
      >
        {/* Zoom Out Button */}
        <button
          onClick={handleZoomOut}
          disabled={zoomLevel <= 1}
          style={{
            background: 'transparent',
            border: 'none',
            color: zoomLevel <= 1 ? (isLightMode ? '#ccc' : '#444') : zoomColor.primary,
            padding: '4px',
            borderRadius: '50%',
            cursor: zoomLevel <= 1 ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
            opacity: zoomLevel <= 1 ? 0.4 : 1,
          }}
          onMouseEnter={(e) => {
            if (zoomLevel > 1) {
              e.currentTarget.style.transform = 'scale(1.15)';
              e.currentTarget.style.background = `${zoomColor.primary}20`;
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.background = 'transparent';
          }}
          title="Zoom Out"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <circle cx="11" cy="11" r="7"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            <line x1="8" y1="11" x2="14" y2="11"/>
          </svg>
        </button>

        {/* Zoom Level Display */}
        <div
          onClick={handleZoomReset}
          style={{
            position: 'relative',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
          title="Click to reset zoom"
        >
          <svg style={{ position: 'absolute', width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
            <circle cx="18" cy="18" r="14" fill="none" stroke={isLightMode ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)'} strokeWidth="2.5"/>
            <circle
              cx="18"
              cy="18"
              r="14"
              fill="none"
              stroke={zoomColor.primary}
              strokeWidth="2.5"
              strokeDasharray={`${zoomPercent * 0.88} 88`}
              strokeLinecap="round"
              style={{ transition: 'stroke-dasharray 0.3s ease', filter: `drop-shadow(0 0 3px ${zoomColor.glow})` }}
            />
          </svg>
          <span
            style={{
              fontSize: '10px',
              fontWeight: 'bold',
              color: zoomColor.primary,
              fontFamily: 'monospace',
              textShadow: `0 0 6px ${zoomColor.glow}`,
            }}
          >
            {zoomLevel.toFixed(1)}x
          </span>
        </div>

        {/* Zoom In Button */}
        <button
          onClick={handleZoomIn}
          disabled={zoomLevel >= 8}
          style={{
            background: 'transparent',
            border: 'none',
            color: zoomLevel >= 8 ? (isLightMode ? '#ccc' : '#444') : zoomColor.primary,
            padding: '4px',
            borderRadius: '50%',
            cursor: zoomLevel >= 8 ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
            opacity: zoomLevel >= 8 ? 0.4 : 1,
          }}
          onMouseEnter={(e) => {
            if (zoomLevel < 8) {
              e.currentTarget.style.transform = 'scale(1.15)';
              e.currentTarget.style.background = `${zoomColor.primary}20`;
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.background = 'transparent';
          }}
          title="Zoom In"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <circle cx="11" cy="11" r="7"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            <line x1="11" y1="8" x2="11" y2="14"/>
            <line x1="8" y1="11" x2="14" y2="11"/>
          </svg>
        </button>
      </div>

      {/* Right side - Icon buttons */}
      <div style={{ 
        display: 'flex', 
        gap: '0.5rem',
        alignItems: 'center'
      }}>
        {iconButtons.map((btn) => {
          const IconComponent = btn.icon;
          return (
            <button
              key={btn.id}
              className="icon-button"
              title={btn.label}
              style={{
                width: '2rem',
                height: '2rem',
                background: isLightMode ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.08)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: `1px solid ${borderColor}`,
                borderRadius: 'var(--radius-md)',
                color: textColor,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = isLightMode ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.18)';
                e.currentTarget.style.transform = 'translateY(-2px) scale(1.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = isLightMode ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.08)';
                e.currentTarget.style.transform = 'translateY(0) scale(1)';
              }}
              onClick={btn.action}
            >
              <IconComponent />
            </button>
          );
        })}
      </div>

      {/* CSS Animations */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Merienda:wght@300;400;500;600;700&display=swap');
        
        @keyframes dropdownFadeIn {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default MenuBar;
