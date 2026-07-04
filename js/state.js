export const appState = {
  currentTab: "tab-overview",
  currentSession: 1, // 1 to 8
  dialogueIndex: 0,
  dialogueHistory: [],
  cctvEnhanced: false,
  cctvActiveFilter: "deblur",
  
  // Interactive Judge Input State
  judgeInputSubmitted: false,
  lastJudgeInput: "",
  isGeneratingResponse: false,
  
  // Leaflet map vars
  map: null,
  mapMarkers: [],
  mapPolyline: null,
  mapInitialized: false,

  // Mock Active Case data for timeline mapping
  activeCase: {
    digitalFootprint: {
      gpsLogs: [
        { lat: -6.2088, lng: 106.8456, label: "Log 1 - Kos Menteng", time: "22:45" },
        { lat: -6.2120, lng: 106.8380, label: "Log 2 - Jl. Rasuna Said", time: "23:05" },
        { lat: -6.2152, lng: 106.8291, label: "Log 3 - TKP Sudirman", time: "23:15" },
        { lat: -6.2170, lng: 106.8220, label: "Log 4 - Jl. Gatot Subroto", time: "23:30" },
        { lat: -6.2088, lng: 106.8456, label: "Log 5 - Kos Menteng", time: "23:50" }
      ]
    }
  },

  // User Decisions / Grading indicators
  userChoices: {
    putusanSela: null,      // "tolak-eksepsi" | "terima-eksepsi"
    cctvVerified: false,
    gpsVerified: false,
    selectedVerdict: "",   // "guilty" | "acquitted"
    selectedArticle: "",   // "pasal-476" | "pasal-477" | "pasal-lain"
    sentenceType: "",      // "penjara" | "kerja-sosial" | "pengawasan"
    sentenceValue: 0,
    legalReasoning: ""
  },
  
  finalScore: 0,
  evaluationDetails: {
    evidenceScore: 0,
    procedureScore: 0,
    articleScore: 0,
    sentenceScore: 0,
    feedback: ""
  }
};
