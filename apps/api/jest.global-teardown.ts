export default async () => {
  await globalThis.__FIELD_NOTE_PG__?.stop();
};
