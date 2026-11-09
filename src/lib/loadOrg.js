const cache = {};

export async function loadDataset(objectKey, org) {
  const key = `${objectKey}/${org.toLowerCase()}`;
  if (cache[key]) return cache[key];
  const res = await fetch(`/data/${key}.json`);
  if (!res.ok) throw new Error(`Failed to load ${key}.json`);
  const json = await res.json();
  cache[key] = json;
  return json;
}
