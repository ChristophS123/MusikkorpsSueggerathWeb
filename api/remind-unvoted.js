const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY || 'AIzaSyBJZdRRa6bhQkdJ5e-rCg1Frb1UgOn7bdk';
const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'musikkorpsminus';

function readFirestoreValue(field) {
  if (!field || typeof field !== 'object') {
    return undefined;
  }
  if ('stringValue' in field) {
    return field.stringValue;
  }
  if ('integerValue' in field) {
    return Number(field.integerValue);
  }
  if ('doubleValue' in field) {
    return Number(field.doubleValue);
  }
  if ('booleanValue' in field) {
    return Boolean(field.booleanValue);
  }
  if ('arrayValue' in field) {
    const values = field.arrayValue?.values;
    return Array.isArray(values) ? values.map((entry) => readFirestoreValue(entry)) : [];
  }
  if ('mapValue' in field) {
    const fields = field.mapValue?.fields || {};
    const mapped = {};
    for (const [key, value] of Object.entries(fields)) {
      mapped[key] = readFirestoreValue(value);
    }
    return mapped;
  }
  return undefined;
}

function readFirestoreDocument(documentPayload) {
  const fields = documentPayload?.fields || {};
  const result = {};
  for (const [key, value] of Object.entries(fields)) {
    result[key] = readFirestoreValue(value);
  }
  return result;
}

async function verifyFirebaseIdToken(idToken) {
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken })
    }
  );

  if (!response.ok) {
    throw new Error('Ungueltiges Auth-Token.');
  }

  const payload = await response.json();
  const user = payload?.users?.[0];
  if (!user?.localId) {
    throw new Error('Ungueltiges Auth-Token.');
  }

  return {
    uid: String(user.localId),
    email: String(user.email || '').trim().toLowerCase()
  };
}

async function getFirestoreDocument(collectionName, documentId) {
  const response = await fetch(
    `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/${collectionName}/${encodeURIComponent(documentId)}`
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Firestore-Lesefehler (${response.status}): ${body}`);
  }

  return readFirestoreDocument(await response.json());
}

async function listFirestoreDocuments(collectionName) {
  const documents = [];
  let pageToken = '';

  do {
    const url = new URL(
      `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/${collectionName}`
    );
    url.searchParams.set('pageSize', '100');
    if (pageToken) {
      url.searchParams.set('pageToken', pageToken);
    }

    const response = await fetch(url);
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Firestore-Listenfehler (${response.status}): ${body}`);
    }

    const payload = await response.json();
    for (const document of payload.documents || []) {
      const mapped = readFirestoreDocument(document);
      const documentId = String(document.name || '').split('/').pop();
      mapped.id = String(mapped.id || documentId || '');
      documents.push(mapped);
    }
    pageToken = String(payload.nextPageToken || '');
  } while (pageToken);

  return documents;
}

function getRespondedUserIds(eventData) {
  const respondedUserIds = new Set();
  const responses = eventData.responses;

  if (responses && typeof responses === 'object' && !Array.isArray(responses)) {
    for (const userIds of Object.values(responses)) {
      if (!Array.isArray(userIds)) {
        continue;
      }
      for (const userId of userIds) {
        const normalizedId = String(userId || '').trim();
        if (normalizedId) {
          respondedUserIds.add(normalizedId);
        }
      }
    }
  }

  for (const fieldName of ['promised', 'cancelled', 'maby']) {
    const userIds = eventData[fieldName];
    if (!Array.isArray(userIds)) {
      continue;
    }
    for (const userId of userIds) {
      const normalizedId = String(userId || '').trim();
      if (normalizedId) {
        respondedUserIds.add(normalizedId);
      }
    }
  }

  return respondedUserIds;
}

function formatEventDate(eventData) {
  const day = Number(eventData.day || 0);
  const month = Number(eventData.month || 0);
  const year = Number(eventData.year || 0);
  const time = String(eventData.time || '').trim();
  const dateLabel = `${String(day).padStart(2, '0')}.${String(month).padStart(2, '0')}.${year}`;
  return time.length > 0 ? `${dateLabel} um ${time} Uhr` : dateLabel;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildReminderHtml({ username, eventName, eventDateLabel, meetingTime, meetingLocation, appLink }) {
  const meetingRows = [];
  if (String(meetingTime || '').trim().length > 0) {
    meetingRows.push(
      `<p style="margin:0 0 8px;color:#355b82;font-size:15px;"><strong>Treffen:</strong> ${escapeHtml(meetingTime)} Uhr</p>`
    );
  }
  if (String(meetingLocation || '').trim().length > 0) {
    meetingRows.push(
      `<p style="margin:0 0 8px;color:#355b82;font-size:15px;"><strong>Ort:</strong> ${escapeHtml(meetingLocation)}</p>`
    );
  }

  return `
<!DOCTYPE html>
<html lang="de">
  <body style="margin:0;padding:0;background:#eef3f9;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eef3f9;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 18px 40px rgba(19,44,77,0.12);">
            <tr>
              <td style="padding:28px 28px 20px;background:linear-gradient(145deg,#123d6e 0%,#0a66c2 58%,#62b6ff 100%);color:#ffffff;">
                <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.16em;text-transform:uppercase;opacity:0.8;">Musikkorps Sueggerath</p>
                <h1 style="margin:0;font-size:26px;line-height:1.2;">Erinnerung zur Abstimmung</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <p style="margin:0 0 16px;color:#17324d;font-size:16px;line-height:1.5;">
                  Hallo ${escapeHtml(username || 'Mitglied')},
                </p>
                <p style="margin:0 0 18px;color:#4f6070;font-size:16px;line-height:1.6;">
                  fuer den Termin <strong style="color:#17324d;">${escapeHtml(eventName)}</strong>
                  hast du noch keine Rueckmeldung abgegeben.
                </p>
                <div style="padding:16px 18px;border-radius:18px;background:#f5f9fc;border:1px solid #e2eaf2;margin:0 0 22px;">
                  <p style="margin:0 0 8px;color:#17324d;font-size:15px;"><strong>Datum:</strong> ${escapeHtml(eventDateLabel)}</p>
                  ${meetingRows.join('')}
                </div>
                <p style="margin:0 0 22px;color:#4f6070;font-size:15px;line-height:1.6;">
                  Bitte stimme jetzt ab, damit die Organisation besser planen kann.
                </p>
                <a href="${escapeHtml(appLink)}"
                   style="display:inline-block;padding:14px 22px;border-radius:16px;background:linear-gradient(145deg,#123d6e 0%,#0a66c2 58%,#62b6ff 100%);color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;">
                  Zu den sonstigen Terminen
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding:0 28px 28px;">
                <p style="margin:0;color:#8a9aab;font-size:12px;line-height:1.5;">
                  Diese E-Mail wurde automatisch ueber die Musikkorps-App versendet.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function getResendApiKey() {
  const apiKey = String(process.env.RESEND_API_KEY || '').trim();
  if (!apiKey) {
    throw new Error('RESEND_API_KEY ist auf Vercel nicht gesetzt.');
  }
  return apiKey;
}

async function sendResendBatch(emails) {
  const apiKey = getResendApiKey();

  for (let index = 0; index < emails.length; index += 100) {
    const chunk = emails.slice(index, index + 100);
    const response = await fetch('https://api.resend.com/emails/batch', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(chunk)
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Resend-Fehler (${response.status}): ${body}`);
    }
  }
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authHeader = String(req.headers.authorization || '');
    const idToken = authHeader.startsWith('Bearer ')
      ? authHeader.slice('Bearer '.length).trim()
      : '';

    if (!idToken) {
      return res.status(401).json({ error: 'Bitte zuerst anmelden.' });
    }

    const eventId = String(req.body?.eventId || '').trim();
    const mode = String(req.body?.mode || 'test').trim().toLowerCase() === 'all'
      ? 'all'
      : 'test';

    if (!eventId) {
      return res.status(400).json({ error: 'Event-ID fehlt.' });
    }

    const authUser = await verifyFirebaseIdToken(idToken);
    const callerData = await getFirestoreDocument('users', authUser.uid);
    if (!callerData || Number(callerData.admin || 0) !== 1) {
      return res.status(403).json({ error: 'Nur Admins duerfen Erinnerungen versenden.' });
    }

    const eventData = await getFirestoreDocument('events', eventId);
    if (!eventData) {
      return res.status(404).json({ error: 'Termin wurde nicht gefunden.' });
    }
    if (Boolean(eventData.training)) {
      return res.status(400).json({ error: 'Erinnerungen sind nur fuer sonstige Termine verfuegbar.' });
    }
    if (Boolean(eventData.eventCancelled)) {
      return res.status(400).json({ error: 'Der Termin ist bereits abgesagt.' });
    }

    const resendFrom = String(
      process.env.RESEND_FROM || 'Musikkorps Sueggerath <onboarding@resend.dev>'
    ).trim();
    const appBaseUrl = String(
      process.env.APP_BASE_URL || 'https://musikkorpssueggerath.vercel.app'
    ).replace(/\/$/, '');
    const eventName = String(eventData.name || 'Termin');
    const eventDateLabel = formatEventDate(eventData);
    const meetingTime = String(eventData.meetingTime || '');
    const meetingLocation = String(eventData.meetingLocation || '');
    const appLink = `${appBaseUrl}/sonstige-termine`;

    let recipients = [];
    let skippedWithoutEmail = 0;

    if (mode === 'test') {
      const callerEmail = String(callerData.email || authUser.email || '').trim().toLowerCase();
      const callerUsername = String(callerData.username || '').trim() || callerEmail;
      if (!callerEmail.includes('@')) {
        return res.status(400).json({
          error: 'Fuer den Testversand fehlt eine gueltige E-Mail am angemeldeten Konto.'
        });
      }
      recipients = [{ email: callerEmail, username: callerUsername }];
    } else {
      const users = await listFirestoreDocuments('users');
      const respondedUserIds = getRespondedUserIds(eventData);

      for (const user of users) {
        const userId = String(user.id || '').trim();
        if (!userId || respondedUserIds.has(userId)) {
          continue;
        }

        const email = String(user.email || '').trim().toLowerCase();
        if (!email.includes('@')) {
          skippedWithoutEmail += 1;
          continue;
        }

        recipients.push({
          email,
          username: String(user.username || '').trim() || email
        });
      }
    }

    if (recipients.length === 0) {
      return res.status(200).json({
        sent: 0,
        skippedWithoutEmail,
        totalUnvoted: skippedWithoutEmail
      });
    }

    const subjectPrefix = mode === 'test' ? '[TEST] ' : '';
    const emails = recipients.map((recipient) => ({
      from: resendFrom,
      to: [recipient.email],
      subject: `${subjectPrefix}Erinnerung: Bitte fuer "${eventName}" abstimmen`,
      html: buildReminderHtml({
        username: recipient.username,
        eventName,
        eventDateLabel,
        meetingTime,
        meetingLocation,
        appLink
      })
    }));

    await sendResendBatch(emails);

    return res.status(200).json({
      sent: emails.length,
      skippedWithoutEmail,
      totalUnvoted: recipients.length + skippedWithoutEmail
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Unbekannter Serverfehler'
    });
  }
};
