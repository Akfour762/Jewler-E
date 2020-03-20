var express = require('express');
var router = express.Router();
var bcrypt = require('bcryptjs');


// ==================================================
// Route Enable Registration
// Path: http://localhost:3002/customer/register
// ==================================================
router.get('/register', function(req, res, next) {
	res.render('customer/register');
});


// ==================================================
// Route Save Customer Registration
// ==================================================
router.post('/', function(req, res, next) {
  let insertquery = "INSERT INTO customer(firstname, lastname, email, phone, address1, address2, city, state, zip, addlnotes, rewardpoints, username, password) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?,?)";
  
	bcrypt.genSalt(10, (err, salt) => {
		bcrypt.hash(req.body.password, salt, (err, hash) => {
			if(err) { res.render('error');}

			db.query(insertquery,[req.body.firstname, req.body.lastname, req.body.email,req.body.phone,req.body.address1, req.body.address2, req.body.city, req.body.state, req.body.zip, req.body.addlnotes, req.body.rewardpoints, req.body.username, hash],(err, result) => {
				if (err) {
					res.render('error');
					} else {
						res.redirect('/');
					}
			});
		});
	});
});


// ==================================================
// Route Provide Login Window
// Path: http://localhost:3002/customer/login
// ==================================================
router.get('/login', function(req, res, next) {
	res.render('customer/login', {message: "Please Login"});
});


// ==================================================
// Route Check Login Credentials
// ==================================================
router.post('/login', function(req, res, next) {
  let query = "select customer_id, firstname, lastname, password from customer WHERE username = '" + req.body.username + "'"; 

  // execute query
  db.query(query, (err, result) => {
		if (err) {res.render('error');} 
		else {
			if(result[0])
				{
				// Username was correct
				// Check if password is correct
				bcrypt.compare(req.body.password, result[0].password, function(err, result1) {
					if(result1) {
						// passwords match
						
						var custid = result[0].customer_id;
						req.session.customer_id = custid;

						var custname = result[0].firstname + " "+ result[0].firstname;
						req.session.custname = custname;
						
						res.redirect('/');
					} else {
						// password do not match
						res.render('customer/login', {message: "Wrong Password"});
					}
					});
				}
			else {res.render('customer/login', {message: "Wrong Username"});}
		} 
 	});
});

// ==================================================
// Route save cart items to SALEORDER and ORDERDETAILS tables
// ==================================================
router.get('/checkout', function(req, res, next) {
	// Check to make sure the customer has logged-in
	if (typeof req.session.customer_id !== 'undefined' && req.session.customer_id ) {
		// Save SALEORDER Record:
		let insertquery = "INSERT INTO saleorder(customer_id, saledate, salenotes) VALUES (?, now(), ?)"; 
		db.query(insertquery,[req.session.customer_id, "Order items " + req.session.cart.length],(err, result) => {
			if (err) {
				console.log(err);
				res.render('error');
				} else {
				// Obtain the order_id value of the newly created SALEORDER Record
				var order_id = result.insertId;
				var proditemprice = 0;
				// Save ORDERDETAIL Records
				// There could be one or more items in the shopping cart
				req.session.cart.forEach((cartitem, index) => { 
				
				
					// Obtain Product ID Price
					let proditemquery = "SELECT saleprice from product where product_id = " + cartitem; 
					db.query(proditemquery, (err, result) => {
						if (err) {res.render('error');}
						proditemprice = result[0].saleprice;
						
						console.log("Prod price: " + proditemprice );
					});

					console.log("Prod price before: " + proditemprice );
					
					// Perform ORDERDETAIL table insert
					let insertquery = "INSERT INTO orderdetail(order_id, product_id, customization, saleprice, prodqty) VALUES (?, ?, 'No Customization', ?, ?)"; 
					db.query(insertquery,[order_id, cartitem, proditemprice, req.session.qty[index]],(err, result) => {
						if (err) {res.render('error');}
					
					});
					
					
				});
				// Empty out the items from the cart and quantity arrays
				req.session.cart = [];
				req.session.qty = [];
				// Display confirmation page
				res.render('catalog/checkout', {ordernum: order_id });
				}		
			});
	}
	else {
		// Prompt customer to login
		res.redirect('/customer/login');
	}
});


module.exports = router;