// Mot de passe oublié : le backend envoie un lien de réinitialisation, qui s'ouvre sur le site.
// La réponse est la même que le compte existe ou non (on ne révèle pas qui a un compte).
import { useState } from 'react';
import { Linking, Text } from 'react-native';

import { api } from '@/api';
import { errorMessage } from '@/lib/api';
import { webLink } from '@/lib/config';
import { TextField } from './forms';
import { Sheet } from './Sheet';
import { Banner, Button, text } from './ui';

const EMAIL = /^\S+@\S+\.\S+$/;

export function ForgotPasswordSheet({ visible, initialEmail, onClose }: { visible: boolean; initialEmail: string; onClose: () => void }) {
  const [email, setEmail] = useState(initialEmail);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Backend de développement uniquement : aucun email n'est envoyé, il renvoie le jeton (comme sur le site).
  const [devLink, setDevLink] = useState<string | null>(null);

  async function send() {
    setSending(true);
    setError(null);
    try {
      const { token } = await api.auth.forgotPassword(email.trim().toLowerCase());
      setDevLink(token ? webLink('/reinitialiser-mot-de-passe', token) : null);
      setSent(true);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSending(false);
    }
  }

  return (
    <Sheet visible={visible} onClose={onClose} title="Mot de passe oublié" subtitle="Vous recevrez un lien pour en choisir un nouveau.">
      {sent ? (
        <>
          <Banner tone="success" icon="mail">
            Si un compte correspond à {email.trim()}, un email avec un lien de réinitialisation vient de vous être envoyé. Le lien est valable 30 minutes.
          </Banner>
          {devLink && (
            <>
              <Text style={text.small}>Mode développement : aucun email n'est envoyé, le lien s'ouvre directement.</Text>
              <Button label="Ouvrir le lien de réinitialisation" variant="secondary" icon="external-link" onPress={() => Linking.openURL(devLink)} />
            </>
          )}
          <Button label="Retour à la connexion" large onPress={onClose} />
        </>
      ) : (
        <>
          <TextField
            label="Adresse email"
            required
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            error={error}
          />
          <Button label="Envoyer le lien" icon="send" large loading={sending} disabled={!EMAIL.test(email.trim())} onPress={send} />
        </>
      )}
    </Sheet>
  );
}
