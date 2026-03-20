module.exports = {
  development: {
    client: "pg",
    connection: {
      host: "127.0.0.1",
      user: "postgres",
      password: "Madhu",
      database: "user_db",
      port: 5432
    },
    migrations: {
      directory: "./migrations"
    }
  }
};