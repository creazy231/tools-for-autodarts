import mitt from "mitt";

const emitter = mitt();

export const useGlobalEvent = emitter.emit;
export const useGlobalListen = emitter.on;
export const useGlobalUnlisten = emitter.off;
