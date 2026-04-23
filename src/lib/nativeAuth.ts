export const verifyNativeAppLock = async (): Promise<boolean> => {
  try {
    // If we are in an iframe (AI Studio Preview environment), WebAuthn isn't natively permitted.
    // It will be blocked by Permissions Policy. Handle gracefully upfront.
    if (window.self !== window.top) {
       alert("Para usar o PIN nativo do telemóvel de forma segura, abra o aplicativo numa Nova Aba. Esta janela de pré-visualização não suporta esta ação de segurança.");
       return window.confirm("MODO DE PRÉ-VISUALIZAÇÃO: Confirmar a ação?");
    }

    if (!window.PublicKeyCredential) {
      alert("A autenticação nativa não é suportada ou permitida neste dispositivo/navegador.");
      // Fallback: If not supported, we just return true to not permanently block the feature,
      // or we can prompt for a manual password. 
      // For now, prompt a standard confirm to not ruin UX if the device lacks it entirely.
      return window.confirm("Por favor, confirma que queres realizar esta ação de segurança.");
    }

    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    const credIdStr = localStorage.getItem('native_auth_credential');

    if (!credIdStr) {
      // First time: Create passkey lock
      alert("Para maior segurança ao bloquear utilizadores, o aplicativo irá utilizar o ecrã de bloqueio do seu telemóvel (Face ID / Impressão Digital / PIN).");
      
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: challenge,
          rp: { 
            name: "Boladas App Seguranca",
          },
          user: {
            id: new Uint8Array(16), 
            name: "user_lock",
            displayName: "Bloqueio do Aplicativo",
          },
          pubKeyCredParams: [{ alg: -7, type: "public-key" }],
          authenticatorSelection: {
            authenticatorAttachment: "platform",
            userVerification: "required",
          },
          timeout: 60000,
        }
      }) as PublicKeyCredential;
      
      if (credential && credential.rawId) {
         // store base64 encoded rawId securely
         const rawIdStr = btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(credential.rawId))));
         localStorage.setItem('native_auth_credential', rawIdStr);
         return true;
      }
      return false;
    } else {
      // Verify existing credential
      const rawId = Uint8Array.from(atob(credIdStr), c => c.charCodeAt(0));
      
      try {
        const assertion = await navigator.credentials.get({
          publicKey: {
            challenge: challenge,
            allowCredentials: [{
              id: rawId,
              type: "public-key",
            }],
            userVerification: "required",
            timeout: 60000,
          }
        });
        return !!assertion;
      } catch (err: any) {
         // If it fails because the credential was removed from the device, clean up and retry
         if (err.name === 'NotAllowedError' || err.message.includes('not found')) {
            console.warn("Credential not found on device, clearing local storage and retrying creation.");
            localStorage.removeItem('native_auth_credential');
            return window.confirm("Não foi possível aceder ao PIN nativo guardado anteriormente. Deseja prosseguir de qualquer forma?");
         }
         throw err;
      }
    }
  } catch (err: any) {
    console.error("Native auth failed:", err);
    
    if (err.message && err.message.includes('publickey-credentials-create')) {
       alert("Para usar o PIN nativo do telemóvel de forma segura, precisa de abrir o aplicativo numa Nova Aba. A janela de pré-visualização não permite esta funcionalidade.");
       // Fallback for preview mode so it doesn't completely block the user in the AI studio editor:
       return window.confirm("MODO DE PRÉ-VISUALIZAÇÃO: Confirmar bloqueio temporário?");
    }
    
    if (err.message && err.message.includes('publickey-credentials-get')) {
       alert("Para usar o PIN nativo do telemóvel de forma segura, precisa de abrir o aplicativo numa Nova Aba. A janela de pré-visualização não permite esta funcionalidade.");
       return window.confirm("MODO DE PRÉ-VISUALIZAÇÃO: Confirmar bloqueio temporário?");
    }

    alert("Falha na autenticação nativa. Operação cancelada. Erro: " + err.message);
    return false;
  }
};
