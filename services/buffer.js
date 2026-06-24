const BASE = "https://api.buffer.com";

export async function getChannels(token) {
  const orgQuery = `query { account { organizations { id } } }`;
  const orgData = await graphql(token, orgQuery);
  const orgs = orgData.account?.organizations ?? [];
  if (!orgs.length) return { organizations: [], channels: [] };

  const channelsQuery = `query {
    channels(input: { organizationId: "${orgs[0].id}" }) {
      id
      name
      service
    }
  }`;
  const chData = await graphql(token, channelsQuery);
  const channels = chData.channels ?? [];
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
        post { id text dueAt status error { message } }
      }
      ... on MutationError { message }
    }
  }`;

  const data = await graphql(token, mutation);
  const result = data?.createPost;
  if (result?.message) {
    throw new Error(`Buffer createPost error: ${result.message}`);
  }
  const post = result?.post;
  if (post?.status === "error" || post?.error) {
    throw new Error(`Buffer publish error: ${post.error?.message || post.status}`);
  }
  return data;
}

function buildMetadata(service, videoUrl, videoTitle) {
  switch (service) {
    case "instagram":
      return `{ instagram: { type: post, shouldShareToFeed: true } }`;
    case "youtube":
      const title = videoTitle ? JSON.stringify(videoTitle) : '"1section"';
      return `{ youtube: { title: ${title}, privacy: public, categoryId: "24" } }`;
    case "tiktok":
      return `{ tiktok: { isAiGenerated: false } }`;
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
