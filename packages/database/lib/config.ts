export const { MONGO_PASSWORD, MONGO_URL, MONGO_USER } = process.env;

export type MongoConnectionDetails = {
  password: string;
  url: string;
  user: string;
};

const mapping = ['password', 'url', 'user'];

const connectionDetails = (): MongoConnectionDetails =>
  [MONGO_PASSWORD, MONGO_URL, MONGO_USER].reduce(
    (
      details: MongoConnectionDetails,
      current: string,
      i: number
    ): MongoConnectionDetails => {
      if (!current || !current.length) {
        throw new Error(
          `ERROR: Invalid MONGO_${mapping[i].toUpperCase()} env value!`
        );
      }
      return { ...details, [mapping[i]]: current };
    },
    {} as MongoConnectionDetails
  );

export default connectionDetails;
