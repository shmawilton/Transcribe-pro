// MenuBar.tsx - Julius - Week 3
// Menu bar component with dropdown menus and icons

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAppStore } from '../../store/store';
import { useAudioEngine } from '../audio/useAudioEngine';
import { pickAudioFile, validateAudioFile } from '../audio/audioFilePicker';
import PitchControl from '../controls/PitchControl';
import { getProjectSaver } from '../project/ProjectSaver';
import { getProjectLoader } from '../project/ProjectLoader';

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

// New Project Icon (different from Load Project)
const NewProjectIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
    <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
    <path d="M0 2a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2zm15 0a1 1 0 0 0-1-1H2a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V2z"/>
  </svg>
);

const SaveIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
    <path d="M2 1a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H9.5a1 1 0 0 0-1 1v7a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V2a1 1 0 0 0-1-1H2zm0-1h2v4H2V0zm9 0v4h2V0h-2zM5 2h6v6H5V2zm1 8h4v5H6v-5z"/>
  </svg>
);

const SaveAsIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
    <path d="M8.5 1.5V8H1V2a1 1 0 0 1 1-1h6.5zM9 0H2a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V5.5L9 0zm5.5 8a.5.5 0 0 0-1 0v5.5a.5.5 0 0 1-.5.5h-9a.5.5 0 0 1-.5-.5v-9a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5v11A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5V8z"/>
    <path d="M13.5 8.5a.5.5 0 0 0-1 0V10h-1.5a.5.5 0 0 0 0 1H12v1.5a.5.5 0 0 0 1 0V11h1.5a.5.5 0 0 0 0-1H13.5V8.5z"/>
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

const MuteIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
    <line x1="23" y1="9" x2="17" y2="15"/>
    <line x1="17" y1="9" x2="23" y2="15"/>
  </svg>
);

const UnmuteIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
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
  const [pitch, setPitch] = useState(0);
  const [volume, setVolume] = useState(0);
  const [isPitchAnimating, setIsPitchAnimating] = useState(false);
  const [showVolumePopup, setShowVolumePopup] = useState(false);
  const volumePopupRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number } | null>(null);
  
  // Store state
  const theme = useAppStore((state) => state.theme);
  const toggleTheme = useAppStore((state) => state.toggleTheme);
  const isLightMode = theme === 'light';
  const setIsSettingsModalOpen = useAppStore((state) => state.setIsSettingsModalOpen);
  const setIsHelpModalOpen = useAppStore((state) => state.setIsHelpModalOpen);
  
  // Audio engine
  const { loadFile, stop, unloadAudio, isAudioLoaded, resumeAudioContext, setPitch: setAudioPitch, setVolume: setAudioVolume, resetPitch } = useAudioEngine();
  
  // Project reset
  const resetProject = useAppStore((state) => state.resetProject);
  
  // Project name state
  const [projectName, setProjectName] = useState<string>('Untitled Project');
  
  // Project saver
  const [projectSaver] = useState(() => getProjectSaver(
    (message, type) => {
      // Simple notification - could be enhanced with a toast component
      if (type === 'error') {
        alert(`Error: ${message}`);
      } else {
        console.log(`Success: ${message}`);
        // Could show a success toast here
      }
    },
    (name) => {
      // Update project name when it changes
      setProjectName(name);
    }
  ));

  // Project loader
  const [projectLoader] = useState(() => getProjectLoader(
    (message: string, type: 'success' | 'error') => {
      // Simple notification - could be enhanced with a toast component
      if (type === 'error') {
        alert(`Error: ${message}`);
      } else {
        console.log(`Success: ${message}`);
        // Could show a success toast here
      }
    },
    (name: string) => {
      // Update project name when it changes
      setProjectName(name);
    },
    (filePath: string | null) => {
      // Update project saver path when project is loaded
      projectSaver.setCurrentProjectPath(filePath);
    }
  ));
  
  // Get pitch from store
  const storedPitch = useAppStore((state) => state.globalControls.pitch);
  const storePitch = useAppStore((state) => state.setPitch);
  
  // Get mute state from store
  const isMuted = useAppStore((state) => state.globalControls.isMuted);
  const toggleMute = useAppStore((state) => state.toggleMute);
  const storedVolume = useAppStore((state) => state.globalControls.volume);
  
  // Sync pitch with store
  useEffect(() => {
    if (storedPitch !== undefined) {
      setPitch(storedPitch);
    }
  }, [storedPitch]);

  // Initialize volume to +6 dB (maximum volume) on mount
  useEffect(() => {
    // Always initialize to +6 dB (maximum volume) on mount
    const initialVolume = 6;
    setVolume(initialVolume);
    setAudioVolume(initialVolume);
    useAppStore.getState().setVolume(initialVolume);
    console.log('[MenuBar] Volume initialized to +6 dB (maximum volume)');
  }, []); // Only run once on mount

  // Apply volume when audio loads - ensure it's at +6 dB
  useEffect(() => {
    if (isAudioLoaded) {
      // When audio loads, ensure volume is at +6 dB (maximum) if not muted
      const currentVolume = useAppStore.getState().globalControls.volume;
      const isCurrentlyMuted = useAppStore.getState().globalControls.isMuted;
      
      if (!isCurrentlyMuted && currentVolume !== 6) {
        // Reset to +6 dB if not muted and not already at +6
        setVolume(6);
        setAudioVolume(6);
        useAppStore.getState().setVolume(6);
        console.log('[MenuBar] Volume reset to +6 dB on audio load');
      } else if (!isCurrentlyMuted) {
        // Ensure volume is applied even if already at +6
        setAudioVolume(6);
        console.log('[MenuBar] Volume applied at +6 dB on audio load');
      }
    }
  }, [isAudioLoaded, setAudioVolume]);

  // Sync volume with store
  useEffect(() => {
    if (storedVolume !== undefined) {
      setVolume(storedVolume);
      setAudioVolume(storedVolume);
    }
  }, [storedVolume, setAudioVolume]);

  // Close volume popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (volumePopupRef.current && !volumePopupRef.current.contains(e.target as Node)) {
        setShowVolumePopup(false);
      }
    };
    if (showVolumePopup) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showVolumePopup]);
  
  // Zoom controls state
  const zoomLevel = useAppStore((state) => state.ui.zoomLevel);
  const setZoomLevel = useAppStore((state) => state.setZoomLevel);
  const viewportStart = useAppStore((state) => state.ui.viewportStart);
  const viewportEnd = useAppStore((state) => state.ui.viewportEnd);
  const setViewport = useAppStore((state) => state.setViewport);
  const duration = useAppStore((state) => state.audio.duration);
  const currentTime = useAppStore((state) => state.audio.currentTime);
  
  // Calculate dropdown position when menu opens
  useEffect(() => {
    if (openMenu && menuButtonRefs.current[openMenu]) {
      const button = menuButtonRefs.current[openMenu];
      if (button) {
        const rect = button.getBoundingClientRect();
        // Use fixed positioning (relative to viewport)
        setDropdownPosition({
          top: rect.bottom,
          left: rect.left,
        });
      }
    } else {
      setDropdownPosition(null);
    }
  }, [openMenu]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      // Check if click is on the portal dropdown
      const portalDropdown = document.querySelector('[data-dropdown-portal]');
      if (portalDropdown && portalDropdown.contains(target)) {
        return; // Click is inside dropdown, don't close
      }
      // Check if click is outside menu bar
      if (menuRef.current && !menuRef.current.contains(target)) {
        setOpenMenu(null);
      }
    };
    if (openMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [openMenu]);

  // Initialize theme on mount
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Start auto-save when audio is loaded
  useEffect(() => {
    if (isAudioLoaded) {
      projectSaver.startAutoSave();
    } else {
      projectSaver.stopAutoSave();
    }
    
    // Cleanup on unmount
    return () => {
      projectSaver.stopAutoSave();
    };
  }, [isAudioLoaded, projectSaver]);

  // Reset project name when audio is unloaded
  useEffect(() => {
    if (!isAudioLoaded) {
      setProjectName('Untitled Project');
    }
  }, [isAudioLoaded]);

  // File menu actions
  const handleStartNewProject = async () => {
    try {
      // Check if project has unsaved changes
      const hasUnsavedChanges = isAudioLoaded && !projectSaver.hasSavedProject();
      
      if (hasUnsavedChanges) {
        const shouldSave = confirm(
          'You have unsaved changes in your current project.\n\n' +
          'Would you like to save before starting a new project?\n\n' +
          'Click OK to save, or Cancel to discard changes and start fresh.'
        );
        
        if (shouldSave) {
          const saved = await projectSaver.saveProject();
          if (!saved) {
            // User cancelled save, don't proceed with new project
            return;
          }
        }
      }
      
      // Reset project state (fresh start)
      stop();
      unloadAudio();
      resetProject();
      projectSaver.setCurrentProjectPath(null);
      setProjectName('Untitled Project');
      
      // Now load new audio
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
      console.error('Failed to start new project:', err);
    }
  };

  const handleLoadProject = async () => {
    try {
      // Check if project has unsaved changes
      const hasUnsavedChanges = isAudioLoaded && !projectSaver.hasSavedProject();
      
      if (hasUnsavedChanges) {
        const shouldSave = confirm(
          'You have unsaved changes in your current project.\n\n' +
          'Would you like to save before loading a project?\n\n' +
          'Click OK to save, or Cancel to discard changes and load the project.'
        );
        
        if (shouldSave) {
          const saved = await projectSaver.saveProject();
          if (!saved) {
            // User cancelled save, don't proceed with loading
            return;
          }
        }
      }
      
      await resumeAudioContext();
      const loaded = await projectLoader.loadProject(loadFile);
      if (loaded) {
        // Project name and path will be updated via callbacks
        // Audio will be loaded automatically by the loader
      }
      setOpenMenu(null);
    } catch (error) {
      console.error('[MenuBar] Failed to load project:', error);
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

  const handleSaveProject = async () => {
    try {
      await projectSaver.saveProject();
      // Project name will be updated via callback
      setOpenMenu(null);
    } catch (error) {
      console.error('[MenuBar] Failed to save project:', error);
    }
  };

  const handleSaveProjectAs = async () => {
    try {
      await projectSaver.saveProjectAs();
      // Project name will be updated via callback
      setOpenMenu(null);
    } catch (error) {
      console.error('[MenuBar] Failed to save project as:', error);
    }
  };

  const handleExit = () => {
    console.log('[MenuBar] Exiting application');
    // First stop any playing audio
    stop();
    // Unload audio
    unloadAudio();
    
    // Stop auto-save
    projectSaver.stopAutoSave();
    
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
  
  // Simple zoom colors - white and green only
  const zoomColor = KENYAN_GREEN;
  const zoomPercent = ((zoomLevel - 1) / 7) * 100;

  // Handle pitch change (continuous, supports fractional values like 0.6)
  const handlePitchChange = (newPitch: number) => {
    if (!isAudioLoaded) return;
    
    // Round to 0.1 precision for smooth continuous control
    const clampedPitch = Math.max(-2, Math.min(2, Math.round(newPitch * 10) / 10));
    setPitch(clampedPitch);
    setAudioPitch(clampedPitch);
    storePitch(clampedPitch);
    
    setIsPitchAnimating(true);
    setTimeout(() => setIsPitchAnimating(false), 400);
  };

  // Handle volume change
  const handleVolumeChange = (newVolume: number) => {
    const clampedVolume = Math.max(-60, Math.min(6, newVolume));
    setVolume(clampedVolume);
    setAudioVolume(clampedVolume);
    // Update store volume
    useAppStore.getState().setVolume(clampedVolume);
    // If unmuting by changing volume, update mute state
    if (isMuted && clampedVolume > -60) {
      useAppStore.getState().toggleMute();
    }
  };

  // Handle mute toggle
  const handleMuteToggle = () => {
    toggleMute();
    // Get updated state after toggle
    const updatedState = useAppStore.getState().globalControls;
    const newVolume = updatedState.isMuted ? -60 : updatedState.volume;
    setVolume(newVolume);
    setAudioVolume(newVolume);
  };

  // Get pitch color
  const getPitchColor = (value: number): string => {
    if (value === 0) return isLightMode ? '#666' : '#aaa';
    if (value > 0) return KENYAN_GREEN;
    return KENYAN_RED;
  };

  // Menu items with their dropdown content
  const menuItems = [
    { 
      id: 'file', 
      label: 'File', 
      icon: FileIcon, 
      color: KENYAN_RED,
      items: [
        { id: 'open', label: 'Start New Project', icon: NewProjectIcon, shortcut: 'Ctrl+O', action: handleStartNewProject },
        { id: 'load-project', label: 'Load Project', icon: FolderOpenIcon, shortcut: 'Ctrl+L', action: handleLoadProject },
        { id: 'divider1', label: '', divider: true },
        { id: 'save', label: 'Save Project', icon: SaveIcon, shortcut: 'Ctrl+S', action: handleSaveProject },
        { id: 'save-as', label: 'Save Project As...', icon: SaveAsIcon, shortcut: 'Ctrl+Shift+S', action: handleSaveProjectAs },
        { id: 'divider2', label: '', divider: true },
        { id: 'close', label: 'Close Audio', icon: CloseIcon, action: handleCloseAudio },
        { id: 'divider3', label: '', divider: true },
        { id: 'exit', label: 'Exit', icon: ExitIcon, shortcut: 'Alt+F4', action: handleExit },
      ] as DropdownItem[]
    },
    { 
      id: 'effects', 
      label: 'Audio Effects', 
      icon: undefined, // No icon to prevent wrapping issues
      color: KENYAN_GREEN,
      items: [] as DropdownItem[] // Will be populated dynamically
    },
    { 
      id: 'help', 
      label: 'Help', 
      icon: undefined, // No icon to prevent wrapping issues
      color: KENYAN_GREEN,
      items: [
        { id: 'docs', label: 'Documentation', icon: BookIcon, shortcut: 'F1', action: () => { setIsHelpModalOpen(true); setOpenMenu(null); } },
        { id: 'divider1', label: '', divider: true },
        { id: 'about', label: 'About', icon: InfoIcon, action: () => { setIsSettingsModalOpen(true); setOpenMenu(null); } },
      ] as DropdownItem[]
    },
  ];
  
  // Build Audio Effects menu dynamically
  const effectsMenu = menuItems.find(m => m.id === 'effects');
  if (effectsMenu) {
    effectsMenu.items = [
      {
        id: 'pitch-control',
        label: 'Pitch Control',
        action: undefined,
        customRender: true,
      },
    ] as any[];
  }

  // Neumorphic Theme Toggle Component
  const ThemeToggle = () => {
    const isLight = isLightMode;
    const lightThemeColors = {
      bg: '#FCF2EB',
      sun: '#EFB099',
      moon: '#D6C2B5',
      shadow: '#cac2bc',
      light: '#fff'
    };
    const darkThemeColors = {
      bg: '#396273',
      sun: '#8DC4D1',
      moon: '#fff',
      shadow: '#2e4e5c',
      light: '#4d7281'
    };
    const colors = isLight ? lightThemeColors : darkThemeColors;

    return (
      <button
        onClick={toggleTheme}
        style={{
          position: 'relative',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: '7rem',
          height: '3.5rem',
          borderRadius: '30px',
          border: `3px solid ${colors.bg}`,
          fontSize: '0.5rem',
          padding: '0.5rem',
          overflow: 'hidden',
          cursor: 'pointer',
          outline: 'none',
          background: 'none',
          boxShadow: `-3px -3px 3px ${colors.light},
            3px 3px 3px ${colors.shadow},
            inset 2px 2px 3px ${colors.shadow},
            inset 2px 2px 20px ${colors.shadow}`,
          transition: 'all 0.3s ease',
        }}
        title={isLight ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
      >
        <div
          style={{
            position: 'absolute',
            height: '2.4rem',
            width: '2.4rem',
            borderRadius: '50%',
            transform: isLight ? 'translateX(0)' : 'translateX(3.2rem)',
            transition: 'transform 0.3s, background-color 0.1s ease',
            background: colors.bg,
            boxShadow: `inset 2px 2px 2px ${colors.light},
              5px 6px 6px ${colors.shadow}`,
          }}
        />
        <svg
          style={{
            position: 'relative',
            borderRadius: '50%',
            height: '2.4rem',
            width: '2.4rem',
            padding: '7px',
            zIndex: 9,
          }}
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M12 16C14.2091 16 16 14.2091 16 12C16 9.79086 14.2091 8 12 8C9.79086 8 8 9.79086 8 12C8 14.2091 9.79086 16 12 16ZM12 18C15.3137 18 18 15.3137 18 12C18 8.68629 15.3137 6 12 6C8.68629 6 6 8.68629 6 12C6 15.3137 8.68629 18 12 18Z"
            fill={colors.sun}
            opacity={isLight ? 1 : 0.6}
          />
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M11 0H13V4.06189C12.6724 4.02104 12.3387 4 12 4C11.6613 4 11.3276 4.02104 11 4.06189V0ZM7.0943 5.68018L4.22173 2.80761L2.80752 4.22183L5.6801 7.09441C6.09071 6.56618 6.56608 6.0908 7.0943 5.68018ZM4.06189 11H0V13H4.06189C4.02104 12.6724 4 12.3387 4 12C4 11.6613 4.02104 11.3276 4.06189 11ZM5.6801 16.9056L2.80751 19.7782L4.22173 21.1924L7.0943 18.3198C6.56608 17.9092 6.09071 17.4338 5.6801 16.9056ZM11 19.9381V24H13V19.9381C12.6724 19.979 12.3387 20 12 20C11.6613 20 11.3276 19.979 11 19.9381ZM16.9056 18.3199L19.7781 21.1924L21.1923 19.7782L18.3198 16.9057C17.9092 17.4339 17.4338 17.9093 16.9056 18.3199ZM19.9381 13H24V11H19.9381C19.979 11.3276 20 11.6613 20 12C20 12.3387 19.979 12.6724 19.9381 13ZM18.3198 7.0943L21.1923 4.22183L19.7781 2.80762L16.9056 5.6801C17.4338 6.09071 17.9092 6.56608 18.3198 7.0943Z"
            fill={colors.sun}
            opacity={isLight ? 1 : 0.6}
          />
        </svg>
        <svg
          style={{
            position: 'relative',
            borderRadius: '50%',
            height: '2.4rem',
            width: '2.4rem',
            padding: '7px',
            zIndex: 9,
          }}
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M12.2256 2.00253C9.59172 1.94346 6.93894 2.9189 4.92893 4.92891C1.02369 8.83415 1.02369 15.1658 4.92893 19.071C8.83418 22.9763 15.1658 22.9763 19.0711 19.071C21.0811 17.061 22.0565 14.4082 21.9975 11.7743C21.9796 10.9772 21.8669 10.1818 21.6595 9.40643C21.0933 9.9488 20.5078 10.4276 19.9163 10.8425C18.5649 11.7906 17.1826 12.4053 15.9301 12.6837C14.0241 13.1072 12.7156 12.7156 12 12C11.2844 11.2844 10.8928 9.97588 11.3163 8.0699C11.5947 6.81738 12.2094 5.43511 13.1575 4.08368C13.5724 3.49221 14.0512 2.90664 14.5935 2.34046C13.8182 2.13305 13.0228 2.02041 12.2256 2.00253ZM17.6569 17.6568C18.9081 16.4056 19.6582 14.8431 19.9072 13.2186C16.3611 15.2643 12.638 15.4664 10.5858 13.4142C8.53361 11.362 8.73568 7.63895 10.7814 4.09281C9.1569 4.34184 7.59434 5.09193 6.34315 6.34313C3.21895 9.46732 3.21895 14.5326 6.34315 17.6568C9.46734 20.781 14.5327 20.781 17.6569 17.6568Z"
            fill={colors.moon}
            opacity={isLight ? 0.6 : 1}
          />
        </svg>
      </button>
    );
  };

  const iconButtons = [
    { 
      id: 'undo', 
      icon: UndoIcon, 
      label: 'Undo', 
      action: () => {
        const { undo, canUndo } = useAppStore.getState();
        if (canUndo()) {
          undo();
          console.log('[MenuBar] Undo performed');
        } else {
          console.log('[MenuBar] Nothing to undo');
        }
      } 
    },
    { 
      id: 'redo', 
      icon: RedoIcon, 
      label: 'Redo', 
      action: () => {
        const { redo, canRedo } = useAppStore.getState();
        if (canRedo()) {
          redo();
          console.log('[MenuBar] Redo performed');
        } else {
          console.log('[MenuBar] Nothing to redo');
        }
      } 
    },
    { id: 'settings', icon: SettingsIcon, label: 'Settings', action: () => setIsSettingsModalOpen(true) },
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
        alignItems: 'center',
        height: '100%',
        width: '100%',
        gap: '1rem',
        justifyContent: 'space-between',
        position: 'relative',
        zIndex: 999999, // Very high z-index to ensure dropdowns are visible
        padding: '0 1.5rem',
        background: 'rgba(26, 26, 26, 0.6)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        fontFamily: HANDWRITTEN_FONT,
        overflowX: 'hidden', // Prevent horizontal scrolling
        overflowY: 'visible', // Allow dropdowns to overflow vertically
      }}
    >
      {/* Left side - Menu items */}
      <div style={{ 
        display: 'flex',
        gap: '0.25rem',
        alignItems: 'center',
        flexShrink: 0,
        whiteSpace: 'nowrap', // Prevent wrapping
      }}>
        {menuItems.map((item) => {
          const IconComponent = item.icon;
          const isOpen = openMenu === item.id;
          const isHovered = hoveredItem === item.id;
          return (
            <div key={item.id} style={{ position: 'relative', zIndex: isOpen ? 999999 : 'auto' }}>
              <button
                ref={(el) => { menuButtonRefs.current[item.id] = el; }}
                className="menu-bar-button"
          style={{
            padding: '0.4rem 0.9rem',
            height: '2rem',
            background: isOpen ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
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
                  {IconComponent && <IconComponent />}
                  {item.label}
                </span>
              </button>

              {/* Dropdown Menu - rendered via portal below */}
            </div>
          );
        })}
      </div>

      {/* Center - Project Name */}
      <div
        className="mx-auto"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flex: 1,
          padding: '0 1rem',
          minWidth: 0,
        }}
      >
        <div
          style={{
            color: textColor,
            fontFamily: HANDWRITTEN_FONT,
            fontSize: '1rem',
            fontWeight: '600',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: '100%',
            opacity: 0.9,
          }}
          title={projectName}
        >
          {projectName}
        </div>
      </div>

      {/* Center - Zoom Controls */}
      <div
          className="mx-auto flex items-center gap-1 px-2 flex-shrink-0"
          style={{
            marginLeft: 'auto',
            marginRight: 'auto',
            background: 'rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            padding: '4px 12px',
            borderRadius: '24px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
            transition: 'all 0.3s ease',
            maxWidth: '100%',
          }}
      >
        {/* Zoom Out Button */}
        <button
          onClick={handleZoomOut}
          disabled={zoomLevel <= 1}
          style={{
            background: 'rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: zoomLevel <= 1 ? '#666' : '#FFFFFF',
            padding: '4px',
            borderRadius: '50%',
            cursor: zoomLevel <= 1 ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
            opacity: zoomLevel <= 1 ? 0.4 : 1,
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
          }}
          onMouseEnter={(e) => {
            if (zoomLevel > 1) {
              e.currentTarget.style.transform = 'scale(1.15)';
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
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
            background: 'rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '50%',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.1)';
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
          }}
          title="Click to reset zoom"
        >
          <svg style={{ position: 'absolute', width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
            <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="2.5"/>
            <circle
              cx="18"
              cy="18"
              r="14"
              fill="none"
              stroke={zoomColor}
              strokeWidth="2.5"
              strokeDasharray={`${zoomPercent * 0.88} 88`}
              strokeLinecap="round"
              style={{ transition: 'stroke-dasharray 0.3s ease' }}
            />
          </svg>
          <span
            style={{
              fontSize: '10px',
              fontWeight: 'bold',
              color: '#FFFFFF',
              fontFamily: 'monospace',
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
            background: 'rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: zoomLevel >= 8 ? '#666' : '#FFFFFF',
            padding: '4px',
            borderRadius: '50%',
            cursor: zoomLevel >= 8 ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
            opacity: zoomLevel >= 8 ? 0.4 : 1,
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
          }}
          onMouseEnter={(e) => {
            if (zoomLevel < 8) {
              e.currentTarget.style.transform = 'scale(1.15)';
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
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

      {/* Volume Control Button - Next to Zoom Controls */}
      <div style={{ position: 'relative' }} ref={volumePopupRef}>
        <button
          onClick={() => setShowVolumePopup(!showVolumePopup)}
          disabled={!isAudioLoaded}
          style={{
            background: 'rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: isMuted ? '#ff6b7a' : '#ffffff',
            padding: '6px 10px',
            borderRadius: '20px',
            cursor: isAudioLoaded ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
            opacity: isAudioLoaded ? 1 : 0.4,
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
          }}
          onMouseEnter={(e) => {
            if (isAudioLoaded) {
              e.currentTarget.style.transform = 'scale(1.1)';
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
          }}
          title={isMuted ? 'Unmute' : 'Volume Control'}
        >
          {isMuted ? <MuteIcon /> : <UnmuteIcon />}
        </button>

        {/* Volume Control Popup */}
        {showVolumePopup && (
          <div             style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              right: 0,
              padding: '20px',
              minWidth: '280px',
              background: 'rgba(26, 26, 26, 0.85)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '16px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
              zIndex: 1000,
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              animation: 'fadeInScale 0.2s ease-out'
            }}>
            {/* Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '4px'
            }}>
              <span style={{
                fontSize: '0.85rem',
                fontWeight: '600',
                color: isLightMode ? '#666' : '#aaa',
                textTransform: 'uppercase',
                letterSpacing: '1px'
              }}>
                Volume Control
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{
                  fontSize: '1.2rem',
                  fontWeight: '700',
                  color: isLightMode ? '#1a1a1a' : '#ffffff',
                  fontFamily: HANDWRITTEN_FONT
                }}>
                  {isMuted ? 'Muted' : `${volume > 0 ? '+' : ''}${volume} dB`}
                </span>
                <button
                  onClick={() => {
                    handleVolumeChange(6);
                  }}
                  disabled={!isAudioLoaded || volume === 6}
                  style={{
                    padding: '4px 8px',
                    fontSize: '0.7rem',
                    background: volume === 6 ? (isLightMode ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)') : 'transparent',
                    border: `1px solid ${isLightMode ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.2)'}`,
                    borderRadius: '6px',
                    color: isLightMode ? '#666' : '#aaa',
                    cursor: (!isAudioLoaded || volume === 6) ? 'not-allowed' : 'pointer',
                    opacity: (!isAudioLoaded || volume === 6) ? 0.4 : 1,
                    transition: 'all 0.2s ease'
                  }}
                  title="Reset to +6 dB"
                >
                  Reset
                </button>
              </div>
            </div>

            {/* Volume Labels */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '0.7rem',
              color: isLightMode ? '#999' : '#666',
              fontWeight: '500'
            }}>
              <span>-60 dB</span>
              <span>0 dB</span>
              <span>+6 dB</span>
            </div>

            {/* Volume Slider */}
            <input
              type="range"
              min="-60"
              max="6"
              step="1"
              value={volume}
              onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
              onInput={(e) => handleVolumeChange(parseFloat((e.target as HTMLInputElement).value))}
              disabled={!isAudioLoaded}
              style={{
                width: '100%',
                height: '8px',
                borderRadius: '4px',
                position: 'relative',
                display: 'block',
                background: isLightMode 
                  ? `linear-gradient(to right, #ccc 0%, #ccc ${((volume + 60) / 66) * 100}%, #e0e0e0 ${((volume + 60) / 66) * 100}%, #e0e0e0 100%)`
                  : `linear-gradient(to right, #555 0%, #555 ${((volume + 60) / 66) * 100}%, #333 ${((volume + 60) / 66) * 100}%, #333 100%)`,
                outline: 'none',
                cursor: isAudioLoaded ? 'pointer' : 'not-allowed',
                WebkitAppearance: 'none',
                appearance: 'none',
                opacity: isAudioLoaded ? 1 : 0.4,
                transition: 'background 0.1s ease'
              }}
              className="volume-popup-slider"
            />

            {/* Mute/Unmute Toggle Button - Icon Only */}
            <button
              onClick={handleMuteToggle}
              disabled={!isAudioLoaded}
              style={{
                padding: '10px',
                background: isMuted 
                  ? (isLightMode ? 'rgba(220,53,69,0.1)' : 'rgba(220,53,69,0.2)')
                  : (isLightMode ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.1)'),
                border: `1px solid ${isMuted 
                  ? (isLightMode ? 'rgba(220,53,69,0.3)' : 'rgba(220,53,69,0.4)')
                  : (isLightMode ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.2)')}`,
                borderRadius: '10px',
                color: isMuted 
                  ? (isLightMode ? '#dc3545' : '#ff6b7a')
                  : (isLightMode ? '#1a1a1a' : '#ffffff'),
                cursor: isAudioLoaded ? 'pointer' : 'not-allowed',
                opacity: isAudioLoaded ? 1 : 0.4,
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%'
              }}
              onMouseEnter={(e) => {
                if (isAudioLoaded) {
                  e.currentTarget.style.background = isMuted 
                    ? (isLightMode ? 'rgba(220,53,69,0.15)' : 'rgba(220,53,69,0.3)')
                    : (isLightMode ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.15)');
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = isMuted 
                  ? (isLightMode ? 'rgba(220,53,69,0.1)' : 'rgba(220,53,69,0.2)')
                  : (isLightMode ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.1)');
              }}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <MuteIcon /> : <UnmuteIcon />}
            </button>
          </div>
        )}
      </div>

      {/* Right side - Icon buttons */}
      <div className="flex gap-2 items-center flex-shrink-0" style={{ 
        gap: '0.5rem',
      }}>
        {/* Neumorphic Theme Toggle - Hidden for now (dark mode only) */}
        {/* <ThemeToggle /> */}
        
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
                background: 'rgba(255, 255, 255, 0.08)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 'var(--radius-md)',
                color: textColor,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                e.currentTarget.style.transform = 'translateY(-2px) scale(1.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                e.currentTarget.style.transform = 'translateY(0) scale(1)';
              }}
              onClick={btn.action}
            >
              <IconComponent />
            </button>
          );
        })}
      </div>

      {/* Portal-based Dropdown Menu */}
      {openMenu && dropdownPosition && (() => {
        const currentMenu = menuItems.find(m => m.id === openMenu);
        if (!currentMenu) return null;
        
        const dropdownContent = (
          <div
            data-dropdown-portal
            style={{
              position: 'fixed',
              top: `${dropdownPosition.top}px`,
              left: `${dropdownPosition.left}px`,
              minWidth: '240px',
              background: 'rgba(26, 26, 26, 0.95)',
              backgroundColor: 'rgba(26, 26, 26, 0.95)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '8px',
              boxShadow: '0 12px 40px rgba(0, 0, 0, 0.8)',
              padding: '4px',
              zIndex: 1000001,
              animation: 'dropdownFadeIn 0.15s ease-out',
              overflow: 'visible',
              opacity: 1,
            }}
          >
            {currentMenu.items.map((dropItem) => {
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
              
              // Custom render for Audio Effects controls
              if ((dropItem as any).customRender) {
                if (dropItem.id === 'pitch-control') {
                  return (
                    <div 
                      key={dropItem.id} 
                      style={{ 
                        background: 'rgba(0, 0, 0, 0.25)',
                        backgroundColor: 'rgba(0, 0, 0, 0.25)',
                        backdropFilter: 'blur(14px)',
                        WebkitBackdropFilter: 'blur(14px)',
                        borderRadius: '8px',
                        margin: '-4px',
                        padding: '4px',
                        opacity: 1,
                      }}
                    >
                      <PitchControl 
                        onPitchChange={handlePitchChange}
                        isAudioLoaded={isAudioLoaded}
                      />
                    </div>
                  );
                }
                
                return null;
              }
              
              const DropIcon = dropItem.icon;
              return (
                <button
                  key={dropItem.id}
                  onClick={() => {
                    if (dropItem.action) dropItem.action();
                    setOpenMenu(null);
                  }}
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
                    transition: 'all 0.15s ease',
                    whiteSpace: 'nowrap',
                    minWidth: 0,
                    opacity: 1,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
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
        );
        
        return createPortal(dropdownContent, document.body);
      })()}

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
        
        @keyframes pitchPulse {
          0% { transform: scale(1); box-shadow: 0 0 0 rgba(0, 102, 68, 0); }
          50% { transform: scale(1.05); box-shadow: 0 0 25px rgba(0, 102, 68, 0.5); }
          100% { transform: scale(1); box-shadow: 0 0 0 rgba(0, 102, 68, 0); }
        }
        
        @keyframes bubbleFloat {
          0%, 100% { transform: translateY(0) translateX(0); opacity: 0.6; }
          50% { transform: translateY(-20px) translateX(10px); opacity: 0.8; }
        }
        
        @keyframes iconPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.2); }
        }
        
        @keyframes shine {
          0% { transform: translateX(-100%) translateY(-100%) rotate(45deg); }
          100% { transform: translateX(100%) translateY(100%) rotate(45deg); }
        }
        
        /* Pitch Slider Thumb - Properly aligned */
        .pitch-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: linear-gradient(135deg, ${pitch > 0 ? KENYAN_GREEN : pitch < 0 ? KENYAN_RED : (isLightMode ? '#666' : '#aaa')}, ${pitch > 0 ? KENYAN_GREEN + 'CC' : pitch < 0 ? KENYAN_RED + 'CC' : (isLightMode ? '#666CC' : '#aaaCC')});
          cursor: pointer;
          border: 3px solid ${isLightMode ? '#FFFFFF' : '#1a1a1a'};
          box-shadow: 0 0 15px ${pitch > 0 ? KENYAN_GREEN + '80' : pitch < 0 ? KENYAN_RED + '80' : 'rgba(0,0,0,0.3)'}, 0 4px 10px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.3);
          transition: all 0.2s ease;
          position: relative;
          top: -7px;
        }
        
        .pitch-slider::-webkit-slider-thumb:hover {
          transform: scale(1.2);
          box-shadow: 0 0 20px ${pitch > 0 ? KENYAN_GREEN : pitch < 0 ? KENYAN_RED : 'rgba(0,0,0,0.5)'}, 0 6px 15px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.4);
        }
        
        .pitch-slider::-webkit-slider-thumb:active {
          transform: scale(1.15);
        }
        
        .pitch-slider::-moz-range-thumb {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: linear-gradient(135deg, ${getPitchColor(pitch)}, ${getPitchColor(pitch)}CC);
          cursor: pointer;
          border: 3px solid ${isLightMode ? '#FFFFFF' : '#1a1a1a'};
          box-shadow: 0 0 15px ${getPitchColor(pitch)}80, 0 4px 10px rgba(0,0,0,0.4);
        }
        
        /* Volume Slider Thumb - Properly aligned */
        .volume-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: linear-gradient(135deg, ${KENYAN_GREEN}, ${KENYAN_GREEN}CC);
          cursor: pointer;
          border: 3px solid ${isLightMode ? '#FFFFFF' : '#1a1a1a'};
          box-shadow: 0 0 15px ${KENYAN_GREEN}80, 0 4px 10px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.3);
          transition: all 0.2s ease;
          position: relative;
          top: -7px;
        }
        
        .volume-slider::-webkit-slider-thumb:hover {
          transform: scale(1.2);
          box-shadow: 0 0 20px ${KENYAN_GREEN}, 0 6px 15px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.4);
        }
        
        .volume-slider::-webkit-slider-thumb:active {
          transform: scale(1.15);
        }
        
        .volume-slider::-moz-range-thumb {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: linear-gradient(135deg, ${KENYAN_GREEN}, ${KENYAN_GREEN}CC);
          cursor: pointer;
          border: 3px solid ${isLightMode ? '#FFFFFF' : '#1a1a1a'};
          box-shadow: 0 0 15px ${KENYAN_GREEN}80, 0 4px 10px rgba(0,0,0,0.4);
        }
        
        .menu-bar input[type="range"]:disabled::-webkit-slider-thumb {
          background: ${isLightMode ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.3)'};
          box-shadow: none;
          cursor: not-allowed;
        }
        
        .menu-bar input[type="range"]:disabled::-moz-range-thumb {
          background: ${isLightMode ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.3)'};
          box-shadow: none;
          cursor: not-allowed;
        }
        
        /* Volume Popup Slider Thumb - Greyish/White */
        .volume-popup-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: ${isLightMode ? '#ffffff' : '#e0e0e0'};
          cursor: pointer;
          border: 2px solid ${isLightMode ? '#999' : '#666'};
          box-shadow: 0 2px 8px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.5);
          transition: all 0.2s ease;
          margin-top: -6px;
        }
        
        .volume-popup-slider::-webkit-slider-thumb:hover {
          transform: scale(1.15);
          background: ${isLightMode ? '#f5f5f5' : '#f0f0f0'};
          box-shadow: 0 4px 12px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.6);
        }
        
        .volume-popup-slider::-webkit-slider-thumb:active {
          transform: scale(1.1);
        }
        
        .volume-popup-slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: ${isLightMode ? '#ffffff' : '#e0e0e0'};
          cursor: pointer;
          border: 2px solid ${isLightMode ? '#999' : '#666'};
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
          margin-top: -6px;
        }
        
        @keyframes fadeInScale {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(4px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default MenuBar;
