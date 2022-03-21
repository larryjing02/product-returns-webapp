const express = require('express');
const session = require('express-session');
const path = require('path');
const PropertiesReader = require("properties-reader");
const sql = require("mssql");
const bcrypt = require("bcrypt");

//////////////////////////////////////////////////////////////////////

const app = express();

app.use(session({
	secret: 'secret',
	resave: true,
	saveUninitialized: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// View Engine Setup
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'ejs')

const properties = PropertiesReader("conn.properties");

// Create connection to database
const config = {
  user: properties.get("username"),
  password: properties.get("password"),
  server: properties.get("server"),
  database: properties.get("database"),
  encrypt: true,
};
var pool;

//////////////////////////////////////////////////////////////////////

// http://localhost:3000/
app.get('/', function(request, response) {
	// Render login template
	// response.sendFile(path.join(__dirname + '/views/login.html'));
	response.render('login', {
    title: 'Wyze Returns Demo'
  });
});

// http://localhost:3000/auth
app.post('/auth', async function(request, response) {
	// Capture the input fields
	let username = request.body.username;
	let password = request.body.password;
	// Ensure the input fields exists and are not empty
	if (username && password) {
		console.log("Attempting login: " + username);

    const sqlrequest = pool.request();

    const query = `SELECT *
      FROM [dbo].[Users]
      WHERE username = '${username}'`;

    let data = await sqlrequest.query(query);
    if (await verify_login(password, data)) {
      request.session.loggedin = true;
			request.session.username = username;
      request.session.origin = data.recordset[0]["origin"];
      request.session.name = data.recordset[0]["name"];
      request.session.permissions = data.recordset[0]["user_permissions"];
			// Redirect to home page
      response.redirect('/home');
    } else {
      response.send('Incorrect Username and/or Password!');
    }	
	} else {
		response.send('Please enter Username and Password!');
	}
  response.end();
});

async function verify_login(password, data) {
  // Check if data has anything in it first
  if (data.rowsAffected[0] === 0) {
    return false;
  }
  try {
    const pass = data.recordset[0]["password"];
    // Extract salt from stored password
    const salt = pass.substring(0,29);
    // Compute new hash and compare
    const hash = await bcrypt.hash(password, salt);
    // console.log(pass);
    // console.log(hash);
    return (pass === hash);
  } catch (error) {
    console.log(error);
  }
}

// http://localhost:3000/home
app.get('/home', function(request, response) {
	// If the user is loggedin
	if (request.session.loggedin) {

    // TODO: DELETE ME
    // request.session.loggedin = true;
    // request.session.username = "admin";
    // request.session.origin = "ADMIN";
    // request.session.name = "Administrator";
    // request.session.permissions = 1;


    response.render('home', {
      name: request.session.name,
      origin: request.session.origin
    });
	} else {
		// Not logged in
		response.send('Please login to view this page!');
	}
	response.end();
});


// GET endpoint for submit query
app.get("/query/:mac/:dev", async (req, res) => {
  const mac = req.params.mac;
  const dev = req.params.dev;
  res.type("text");
  try {
    if (await mac_found(pool, mac)) {
      query = "MAC " + mac + " was found on the database!";
    } else {
      query = "MAC " + mac + " not found! Adding now.";
      await add_mac(pool, mac, dev, req.session.origin);
    }
    res.status(200);
    res.send(query);
    res.end();
  } catch (error) {
    console.log(error);
    res.status(500);
    res.send("SENDING ERROR");
    res.end();
  }
});

// Returns whether or not MAC exists in database
async function mac_found(pool, mac) {
  const sqlrequest = pool.request();

  const query = `SELECT COUNT(*)
     FROM [dbo].[MAC_Address]
     WHERE mac_addr = '${mac}'`;

  let data = await sqlrequest.query(query);

  // If count returns 0, MAC does not exist in database
  return data.recordset[0][""] == 1;
}

// TODO: Refactor to post
async function add_mac(pool, mac, dev, orig) {
  const sqlrequest = pool.request();

  const query = `INSERT INTO [dbo].[MAC_Address]
  VALUES ('${mac}', '${dev}', 
  (SELECT MAX(ticket_number) + 1 FROM [dbo].[MAC_Address]), 
  '${orig}', GETUTCDATE());`;

  await sqlrequest.query(query);
  console.log("Add to database: " + mac + " : " + dev);
}

// GET endpoint for search
app.get("/search/:mac", async (req, res) => {
  const mac = req.params.mac;
  res.type("text");
  try {
    const sqlrequest = pool.request();

    const query = `SELECT *
       FROM [dbo].[MAC_Address]
       WHERE mac_addr = '${mac}'`;
  
    let data = await sqlrequest.query(query);
    if (data.rowsAffected[0] === 0) {
      console.log("MAC Address not found in database.")
      res.status(200);
      res.send("{}");
      res.end();
    } else {
      res.status(200);
      res.send(JSON.stringify(data.recordset[0]));
      res.end();
    }
  } catch (error) {
    console.log(error);
    res.status(500);
    res.send("SENDING ERROR");
    res.end();
  }
});

// Close connection to database
process.on("SIGINT", () => {
  pool.close();
  console.log("SQL Database disconnected!");
  process.exit();
});

app.listen(3000, async () => {
  pool = await sql.connect(config);
  console.log("SQL Database connected!");
});