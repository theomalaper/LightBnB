const properties = require('./json/properties.json');
const users = require('./json/users.json');
const db = require('../db/index.js')

const { Pool } = require('pg');

const params = {
  port: '5432',
  user: 'vagrant',
  password: '123',
  host: 'localhost',
  database: 'lightbnb',
};

const pool = new Pool(params);
pool.connect();

/// Users

/**
 * Get a single user from the database given their email.
 * @param {String} email The email of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithEmail = function(email) {
  const queryString = `
  SELECT *
  FROM users
  WHERE email = $1;`
  const values = [email];

  return db.query(queryString, values, res => {
    if (res.rows[0]) {
      return res.rows[0];
    } else {
      return null;
    }
  });
};
exports.getUserWithEmail = getUserWithEmail;

/**
 * Get a single user from the database given their id.
 * @param {string} id The id of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithId = function(id) {
  const queryString = `
  SELECT *
  FROM users
  WHERE id = $1;`
  const values = [id];

  return db.query(queryString, values, res => {
    if (res.rows[0]) {
      return res.rows[0];
    } else {
      return null;
    }
  });
};
exports.getUserWithId = getUserWithId;


/**
 * Add a new user to the database.
 * @param {{name: string, password: string, email: string}} user
 * @return {Promise<{}>} A promise to the user.
 */
const addUser =  function(user) {
  const queryString = `
  INSERT INTO users (name, email, password)
  VALUES ($1, $2, $3)
  RETURNING *;`
  const values = [user.name, user.email, user.password]

  return db.query(queryString, values, newUser => {
    return newUser;
  });
};
exports.addUser = addUser;

/// Reservations

/**
 * Get all reservations for a single user.
 * @param {string} guest_id The id of the user.
 * @return {Promise<[{}]>} A promise to the reservations.
 */
const getAllReservations = function(guest_id, limit = 10) {
  const queryString =`
  SELECT properties.*, reservations.*, AVG(property_reviews.rating) as average_rating
  FROM reservations
  JOIN properties ON property_id = properties.id 
  JOIN property_reviews ON reservation_id = reservations.id
  WHERE reservations.guest_id = $1 AND reservations.end_date < now()::date
  GROUP BY properties.id, reservations.id
  ORDER BY reservations.start_date
  LIMIT $2;`
  const values = [guest_id, limit]

  return db.query(queryString, values, res => res.rows);
};
exports.getAllReservations = getAllReservations;

/// Properties\q

/**
 * Get all properties.
 * @param {{}} options An object containing query options.
 * @param {*} limit The number of results to return.
 * @return {Promise<[{}]>}  A promise to the properties.
 */
const getAllProperties = function(options, limit = 10) {
  let queryParams = [];
  let queryString = `
  SELECT properties.*, AVG(property_reviews.rating) as average_rating
  FROM properties
  JOIN property_reviews ON properties.id = property_id
  `;

  for (let parameter in options)  {
    if (parameter === 'city' && options[parameter]) {
      queryParams.push(`%${options[parameter]}%`)
      queryString += `WHERE city LIKE $${queryParams.length}`;
    } else if (queryParams.length === 0 && parameter === 'minimum_price_per_night' && options[parameter]) {
      queryParams.push(options[parameter])
      queryString += `WHERE cost_per_night >= $${queryParams.length}`
    } else if (queryParams.length === 0 && parameter === 'maximum_price_per_night' && options[parameter]) {
      queryParams.push(options[parameter])
      queryString += `WHERE cost_per_night <= $${queryParams.length}`
    } else if (parameter === 'minimum_price_per_night' && options[parameter]) {
      queryParams.push(options[parameter])
      queryString += `AND cost_per_night >= $${queryParams.length}`
    } else if (parameter === 'maximum_cost_night' && options[parameter]) {
      queryParams.push(options[parameter])
      queryString += `AND cost_per_night w= $${queryParams.length}`
    }
  };

  queryString += `
  GROUP BY properties.id`;

  if (options['minimum_rating']) {
    queryParams.push(options.minimum_rating)
    queryString += `
    HAVING AVG(property_reviews.rating) >= $${queryParams.length}`
  }

  queryParams.push(limit);
  queryString += `
  ORDER BY cost_per_night
  LIMIT $${queryParams.length};`;

  return db.query(queryString, queryParams, res => res.rows);
}

exports.getAllProperties = getAllProperties;


/**
 * Add a property to the database
 * @param {{}} property An object containing all of the property details.
 * @return {Promise<{}>} A promise to the property.
 */
const addProperty = function(property) {
  const queryString = `
  INSERT INTO properties (owner_id, title, description, thumbnail_photo_url, cover_photo_url, cost_per_night, parking_spaces, number_of_bathrooms, number_of_bedrooms, country, street, city, province, post_code)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
  RETURNING *;`
  const queryParams = [property.owner_id, property.title, property.description, property.thumbnail_photo_url, property.cover_photo_url, property.cost_per_night, property.parking_spaces, property.number_of_bathrooms, property.number_of_bedrooms, property.country, property.street, property.city, property.province, property.post_code] 
  
  return db.query(queryString, queryParams, res => res.rows[0]);
};
exports.addProperty = addProperty;
