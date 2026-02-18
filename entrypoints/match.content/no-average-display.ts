export async function noAverageDisplay() {
  try {
    const config = await AutodartsToolsConfig.getValue();

    if (!config.noAverageDisplay.enabled) {
      return;
    }

    console.log("Autodarts Tools: No Average Display activated");
    addStyles(`
        .ad-ext-player > div > div:nth-of-type(2) { display: none!important; }
        `);
  } catch (e) {
    console.error("Autodarts Tools: Next player on takeout stuck - Error: ", e);
  }
}
