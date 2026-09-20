import React, { useState } from "react";
import { useWindowSize } from "ink";
import { resolveCurrentSettings, readCropcodePlusApiKey } from "@yuanyuanma03/cropcode-core";
import { LoginScreen } from "../LoginScreen";
import { AppContext } from "../contexts";
import App from "./App";
import { RawModeProvider } from "../contexts";

const AppContainer: React.FC<{
  projectRoot: string;
  version: string;
  initialPrompt: string | undefined;
  resumeSessionId: string | true | undefined;
  forkSessionId: string | undefined;
  onRestart: () => void;
}> = ({ version, projectRoot, initialPrompt, resumeSessionId, forkSessionId, onRestart }) => {
  const { columns } = useWindowSize();
  const [needsLogin, setNeedsLogin] = useState(
    () => !resolveCurrentSettings(projectRoot).apiKey && !readCropcodePlusApiKey()
  );
  if (needsLogin) return <LoginScreen width={columns ?? 80} onComplete={() => setNeedsLogin(false)} />;
  return (
    <AppContext.Provider value={{ version: version }}>
      <RawModeProvider>
        <App
          initialPrompt={initialPrompt}
          resumeSessionId={resumeSessionId}
          forkSessionId={forkSessionId}
          projectRoot={projectRoot}
          onRestart={onRestart}
        />
      </RawModeProvider>
    </AppContext.Provider>
  );
};

export default AppContainer;
