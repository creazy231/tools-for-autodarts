export const QR_CODE_OPTIONS = {
  type: "canvas",
  shape: "square",
  width: 300,
  height: 300,
  data: "https://play.autodarts.com/lobbies/0196aa5d-3b34-7421-b326-8dd2e2ebd6d3",
  margin: 0,
  qrOptions: {
    typeNumber: "0",
    mode: "Byte",
    errorCorrectionLevel: "Q",
  },
  imageOptions: {
    saveAsBlob: true,
    hideBackgroundDots: true,
    imageSize: 0.4,
    margin: 5,
  },
  dotsOptions: {
    type: "extra-rounded",
    color: "#297dc7",
    roundSize: true,
    gradient: {
      type: "linear",
      rotation: 0.7853981633974483,
      colorStops: [
        {
          offset: 0,
          color: "#3662b9",
        },
        {
          offset: 1,
          color: "#2d285b",
        },
      ],
    },
  },
  backgroundOptions: {
    round: 0,
    color: "#ffffff",
  },
  image: "data:image/png;base64,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",
  dotsOptionsHelper: {
    colorType: {
      single: true,
      gradient: false,
    },
    gradient: {
      linear: true,
      radial: false,
      color1: "#6a1a4c",
      color2: "#6a1a4c",
      rotation: "0",
    },
  },
  cornersSquareOptions: {
    type: "extra-rounded",
    color: "#000000",
    gradient: {
      type: "linear",
      rotation: -0.7853981633974483,
      colorStops: [
        {
          offset: 0,
          color: "#3662b9",
        },
        {
          offset: 1,
          color: "#2d285b",
        },
      ],
    },
  },
  cornersSquareOptionsHelper: {
    colorType: {
      single: true,
      gradient: false,
    },
    gradient: {
      linear: true,
      radial: false,
      color1: "#000000",
      color2: "#000000",
      rotation: "0",
    },
  },
  cornersDotOptions: {
    type: "",
    color: "#000000",
    gradient: {
      type: "linear",
      rotation: 0.7853981633974483,
      colorStops: [
        {
          offset: 0,
          color: "#3662b9",
        },
        {
          offset: 1,
          color: "#2d285b",
        },
      ],
    },
  },
  cornersDotOptionsHelper: {
    colorType: {
      single: true,
      gradient: false,
    },
    gradient: {
      linear: true,
      radial: false,
      color1: "#000000",
      color2: "#000000",
      rotation: "0",
    },
  },
  backgroundOptionsHelper: {
    colorType: {
      single: true,
      gradient: false,
    },
    gradient: {
      linear: true,
      radial: false,
      color1: "#ffffff",
      color2: "#ffffff",
      rotation: "0",
    },
  },
};
