exports.up = function (knex) {
  return knex.schema.createTable("users", (table) => {
    table.uuid("id").primary();

    table.string("name", 250).notNullable();

    table.string("email", 250).notNullable().unique();

    table.integer("age").notNullable();

    table.enu("gender", ["Male", "Female"]).notNullable();

    table.string("company", 250);

    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable("users");
};