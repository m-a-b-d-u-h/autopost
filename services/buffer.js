const BASE = "https://api.buffer.com";

export async function getChannels(token) {
  const query = `query GetChannels {
    account {
      organizations {
        id
        channels {
          id
          name
          service
        }
      }
    }
  }`;

  const data = await graphql(token, query);
  const orgs = data.account?.organizations ?? [];
  const channels = orgs.flatMap((o) => o.channels ?? []);
  return { organizations: orgs, channels };
}

export async function createPost(token, channelId, text, videoUrl, service, videoTitle) {
  const assets = videoUrl
    ? `assets: [{ video: { url: "${videoUrl}" } }]`
    : "";

  const metadata = buildMetadata(service, videoUrl, videoTitle);
  const metaField = metadata ? `metadata: ${metadata}` : "";

  const mutation = `mutation CreatePost {
    createPost(input: {
      text: ${JSON.stringify(text)}
      channelId: "${channelId}"
      schedulingType: automatic
      mode: shareNow
      ${metaField}
      ${assets}
    }) {
      ... on PostActionSuccess {
        post { id text dueAt }
      }
      ... on MutationError { message }
    }
  }`;

  return graphql(token, mutation);
}

function buildMetadata(service, videoUrl, videoTitle) {
  switch (service) {
    case "instagram":
      return `{ instagram: { type: post, shouldShareToFeed: true } }`;
    case "youtube":
      const title = videoTitle ? JSON.stringify(videoTitle) : '"1section"';
      return `{ youtube: { title: ${title}, privacy: public, categoryId: "24" } }`;
    case "twitter":
      return null;
    default:
      return null;
  }
}

async function graphql(token, query) {
  const res = await fetch(BASE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Buffer API error ${res.status}: ${err}`);
  }

  const json = await res.json();
  if (json.errors) {
    throw new Error(`Buffer GraphQL error: ${json.errors.map((e) => e.message).join("; ")}`);
  }

  return json.data;
}
