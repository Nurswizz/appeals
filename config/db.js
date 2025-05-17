const { MongoClient } = require("mongodb");

const uri = process.env.MONGODB_URI || "mongodb://localhost:27017";
const client = new MongoClient(uri);

async function connectToDatabase(dbName = "ts") {
  try {
    if (client.topology && client.topology.isConnected()) {
      console.log("Already connected to MongoDB.");
      return client.db(dbName);
    }
    await client.connect();
    await client.db(dbName).command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB."
    );

    return client.db(dbName);
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    throw error;
  }
}

connectToDatabase()
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((error) => {
    console.error("Error connecting to MongoDB:", error);
  });

const db = client.db("ts");

module.exports = {
  db,
};
