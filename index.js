//-------------------++++-----------------
// Importing Required Modules
const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
//-------------------++++-----------------

// Set the port
const port = process.env.PORT || 5005;
//-------------------++++-----------------
//Middleware
app.use(cors());
app.use(express.json());
//-------------------++++-----------------

// console.log(process.env.DB_USER);
// console.log(process.env.DB_PASS);

// Connection string
const {
  MongoClient,
  ServerApiVersion,
  ObjectId,
  Collection,
} = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.4vti4xu.mongodb.net/?retryWrites=true&w=majority`;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});
async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect(); comment for deploy

    //-------------------++++-----------------
    //Collection declare
    const productCollection = client
      .db("storeManagementApp")
      .collection("products");
    const salesRecordsCollection = client
      .db("storeManagementApp")
      .collection("salesRecords");
    // const categoryCollection = client
    //   .db("storeManagementApp")
    //   .collection("categories");

    // ---------Working----------
    const categoryCollection = client
      .db("storeManagementApp")
      .collection("tCategory");
    const subCategoryCollection = client
      .db("storeManagementApp")
      .collection("tSubcategory");
    const subSubCategoryCollection = client
      .db("storeManagementApp")
      .collection("tSubsubcategory");

    const brandCollection = client
      .db("storeManagementApp")
      .collection("brands");
    const customersCollection = client
      .db("storeManagementApp")
      .collection("customers");
    const invoiceCollection = client
      .db("storeManagementApp")
      .collection("invoiceCounters");
    const pcCollection = client
      .db("storeManagementApp")
      .collection("productCounters"); // pc -- product counter

    //-------------------++++-----------------
    // Function to generate a 7-digit productCode with prefix 'P'
    const generateProductCode = async () => {
      // Find or create a counter document
      const counterDoc = await pcCollection.findOneAndUpdate(
        { _id: "productCounter" }, // Using a fixed ID to track sequence
        { $inc: { sequence: 1 } }, // Increment the sequence by 1
        { upsert: true, returnDocument: "after" } // Create if not exists, return updated document
      );
      // Extract the sequence from the updated document, defaulting to 1 if undefined
      const sequence = counterDoc?.sequence || 1;
      // Pad the sequence to 4 digits (e.g., 0001, 0002, etc.)
      const sequencePart = String(sequence).padStart(5, "0");
      // Return the pc number in the format: P-SEQ
      return `P${sequencePart}`;
    };

    // Product Cost Calculation
    // const productCostCalculation = async (costRMB, rmbRate, transportCost) => {
    //   // Convert string values to numbers (float or integer)
    //   const costRMBNum = parseFloat(costRMB);
    //   const rmbRateNum = parseFloat(rmbRate);
    //   const transportCostNum = parseFloat(transportCost);

    //   // Debug: Check converted values
    //   // console.log(costRMBNum, rmbRateNum, transportCostNum);

    //   // Perform the calculation
    //   const result = ((costRMBNum * rmbRateNum + transportCostNum) * 1).toFixed(
    //     2
    //   );

    //   return result;
    // };
    // Function to generate a unique invoice number
    const getInvoiceNumber = async () => {
      const date = new Date(); // Get the current date in local time
      const datePart = date.toLocaleDateString("en-CA").replace(/-/g, ""); // Format YYYYMMDD

      // Find or create a counter document for the current date
      const counterDoc = await invoiceCollection.findOneAndUpdate(
        { date: datePart }, // Query by date
        { $inc: { sequence: 1 } }, // Increment sequence
        { upsert: true, returnDocument: "after" } // Create if not exists, return updated document
      );

      // Extract the sequence from the updated document
      const sequence = counterDoc?.sequence || 1; // Default to 1 if undefined

      // Pad the sequence to 3 digits (e.g., 001, 002, etc.)
      const sequencePart = String(sequence).padStart(3, "0");

      // Return the invoice number in the format: INV-YYYYMMDD-SEQ
      return `INV-${sequencePart}`;
    };

    //-------------------++++-----------------

    //-------+++ Customers ++------------
    // Create a new customer
    app.post("/customers", async (req, res) => {
      try {
        const customer = req.body;
        // console.log(customer);
        const result = await customersCollection.insertOne(customer);
        res.send(result);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Get all customers
    app.get("/customers", async (req, res) => {
      try {
        const customers = await customersCollection.find().toArray();
        res.send(customers);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Update a customer
    app.put("/customers/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const updateData = req.body;
        const result = await customersCollection.findOneAndUpdate(
          { _id: new ObjectId(id) },
          { $set: updateData },
          { returnOriginal: false } // Ensures that the updated document, not the original, is returned.
        );
        res.json(result.value);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Delete a customer
    app.delete("/customers/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const result = await customersCollection.deleteOne({
          _id: new ObjectId(id),
        });
        res.json({ message: "Customer deleted" });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
    // ----------------------------------

    //-------+++ Products ++------------
    // Finding
    app.get("/products", async (req, res) => {
      const result = await productCollection.find().toArray();
      res.send(result);
    });
    // Finding using id
    app.get("/products/:id", async (req, res) => {
      const { id } = req.params;
      const query = { _id: new ObjectId(id) };
      // console.log(query);
      const result = await productCollection.find(query).toArray();
      // console.log(result);
      res.send(result);
    });
    // Creating
    app.post("/products", async (req, res) => {
      try {
        // Destructure the product details from the request body
        const {
          category,
          subCategory,
          subsubCategory,
          brand,
          inStock,
          stockAlert,
          costRMB,
          rmbRate,
          transportCost,
          productCost,
          productPrice,
          date,
        } = req.body;

        // Generate the product code
        const productCode = await generateProductCode();
        // console.log("Product Code", productCode);

        // Product Cost Calculation
        // const productCost = await productCostCalculation(
        //   costRMB,
        //   rmbRate,
        //   transportCost
        // );

        // const productPrice = parseFloat((parseFloat(productCost) * 1.1).toFixed(2)).toFixed(2);

        // console.log(productPrice);

        // const inStock = parseInt(productQuantity);

        // Create the new product object
        const newProduct = {
          category,
          subCategory,
          subsubCategory,
          brand,
          inStock,
          stockAlert,
          costRMB,
          rmbRate,
          transportCost,
          productCost,
          productPrice,
          date,
          productCode, // Assign generated product code here
        };

        // console.log(newProduct);

        // Insert the new product into the collection
        const result = await productCollection.insertOne(newProduct);

        res.send(result);
      } catch (error) {
        console.error("Error while adding product:", error);
        res.status(500).send({ message: "Failed to add product" });
      }
    });
    // Deleting
    app.delete("/products/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await productCollection.deleteOne(query);
      res.send(result);
    });
    // check-duplicate
    app.post("/products/check-duplicate", async (req, res) => {
      const { category, subCategory, subsubCategory, brand } = req.body;
      try {
        // Check for a product with the same category, subCategory, subsubCategory, and brand
        const duplicate = await productCollection.findOne({
          category,
          subCategory,
          subsubCategory,
          brand,
        });
        // console.log(duplicate);

        if (duplicate) {
          return res
            .status(200)
            .json({ duplicate: true, message: "Product already exists" });
        }
        return res.status(200).json({ duplicate: false });
      } catch (error) {
        console.error("Error checking for duplicates:", error);
        res.status(500).json({ error: "Server error" });
      }
    });
    // Edit Product
    app.patch("/product/:id", async (req, res) => {
      const {
        inStock,
        productQuantity,
        stockAlert,
        costRMB,
        rmbRate,
        transportCost,
        productCost,
        productPrice,
        date,
      } = req.body;
      // console.log(name, categoryName);
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      // Ensure inStock and productQuantity are numbers
      // console.log(parseInt(inStock, 10));
      // console.log(parseInt(productQuantity, 10));
      const updatedInStock =
        parseInt(inStock, 10) + parseInt(productQuantity, 10);
      // console.log(updatedInStock);
      // console.log(filter);
      // console.log(
      //   inStock,
      //   productQuantity,
      //   stockAlert,
      //   costRMB,
      //   rmbRate,
      //   transportCost,
      //   productCost,
      //   productPrice,
      //   date
      // );
      // console.log(filter);
      const updateDoc = {
        $set: {
          inStock: updatedInStock,
          stockAlert: stockAlert,
          costRMB: costRMB,
          rmbRate: rmbRate,
          transportCost: transportCost,
          productCost: productCost,
          productPrice: productPrice,
          date: date,
        },
      };
      const result = await productCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    //-------------------++++-----------------

    //---------------++ Sales ++--------------
    // POST route to handle sales and update the product stock
    app.post("/sale", async (req, res) => {
      const { products, customer } = req.body;
      // console.log(customer);

      try {
        const invoiceNumber = await getInvoiceNumber(); // Generate the invoice number here
        console.log("invoiceNumber inside:", invoiceNumber);
        const bulkOperations = await Promise.all(
          // Promise.all runs multiple asynchronous operations in parallel
          products.map(async (product) => {
            const foundProduct = await productCollection.findOne({
              _id: new ObjectId(product._id),
            });

            let inStock = parseInt(foundProduct.inStock, 10);
            if (isNaN(inStock)) {
              console.error(`Invalid inStock for product ID ${product._id}`);
              return null;
            }

            return {
              updateOne: {
                filter: { _id: new ObjectId(product._id) },
                update: {
                  $inc: { inStock: -parseInt(product.sellingAmount, 10) },
                },
              },
            };
          })
        );

        const validOperations = bulkOperations.filter(Boolean); //Filters out any null values from bulkOperations (from failed operations), leaving only valid operations.
        if (validOperations.length === 0) {
          return res
            .status(400)
            .send({ error: "No valid operations to perform." });
        }

        const stockUpdateResult = await productCollection.bulkWrite(
          validOperations
        );

        // Record the sale in salesRecords collection
        const saleRecord = {
          customer: customer,
          products: products.map((product) => ({
            productId: product._id,
            productName:  `${product.brand}-(${product.subCategory}), ${product.category} ${product.subsubCategory}`,
            quantity: product.sellingAmount,
            price: product.productPrice,
            total: product.productPrice * product.sellingAmount,
          })),
          invoiceNumber: invoiceNumber, // Save the unique invoice number
          date: new Date(),
          totalAmount: products.reduce(
            (total, product) =>
              total + product.productPrice * product.sellingAmount,
            0
          ),
        };

        const recordResult = await salesRecordsCollection.insertOne(saleRecord);

        res.send({ stockUpdateResult, recordResult });
      } catch (error) {
        console.error("Error during sale operation:", error);
        res
          .status(500)
          .send({ error: "Failed to complete sale and save record." });
      }
    });
    // sales list all
    app.get("/sales-list", async (req, res) => {
      try {
        const salesRecords = await salesRecordsCollection
          .find(
            {},
            {
              projection: {
                customer: 1,
                date: 1,
                totalAmount: 1,
                invoiceNumber: 1,
              },
            }
          )
          .toArray();

        if (!salesRecords || salesRecords.length === 0) {
          return res.status(404).json({ message: "No sales records found" });
        }

        res.status(200).json(salesRecords);
      } catch (error) {
        console.error("Error fetching sales records:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    });
    // sales list single (id)
    const { ObjectId } = require("mongodb");
    //get specific sales for an id
    app.get("/sales-list/:id", async (req, res) => {
      try {
        const { id } = req.params;
        // console.log(id);
        const query = { _id: new ObjectId(id) };

        const salesRecord = await salesRecordsCollection.find(query).toArray();

        if (!salesRecord || salesRecord.length === 0) {
          return res.status(404).json({ message: "No sales record found" });
        }

        res.status(200).json(salesRecord);
      } catch (error) {
        console.error("Error fetching sales record:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    });
    // Delete a sale
    app.delete("/sales/:id", async (req, res) => {
      try {
        const { id } = req.params;
        const { specSalesProduct } = req.body;

        const bulkOperations = await Promise.all(
          // Process each product for stock adjustment
          specSalesProduct.map(async (product) => {
            // console.log("product", product);
            // Fetch only the inStock field for the product
            const foundProduct = await productCollection.findOne(
              { _id: new ObjectId(product.productId) }, // Match document by product ID
              { projection: { inStock: 1 } } // Only retrieve the inStock field
            );
            // console.log("Found Product", foundProduct);
            // Access the inStock amount for the found product
            let inStock = parseInt(foundProduct?.inStock, 10);
            // console.log("inStock", inStock);
            if (isNaN(inStock)) {
              console.error(
                `Invalid inStock for product ID ${product?.productId}`
              );
              return null;
            }

            // Build the update operation for the bulk operation
            return {
              updateOne: {
                filter: { _id: new ObjectId(product?.productId) }, // Use the correct field for the product ID
                update: {
                  $inc: { inStock: +parseInt(product?.quantity, 10) }, // Increment inStock based on quantity
                },
              },
            };
          })
        );
        const validOperations = bulkOperations.filter(Boolean); //Filters out any null values from bulkOperations (from failed operations), leaving only valid operations.
        if (validOperations?.length === 0) {
          return res
            .status(400)
            .send({ error: "No valid operations to perform." });
        }

        const stockUpdateResult = await productCollection.bulkWrite(
          validOperations
        );
        //Delete the salesRecord
        const query = { _id: new ObjectId(id) };
        const result = await salesRecordsCollection.deleteOne(query);

        res.send({ stockUpdateResult, result });
      } catch (error) {
        console.error("Error deleting sale:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    });

    //-------------------++++-----------------

    //-------------------++++-----------------
    // category: Query for categories
    // app.get("/categories", async (req, res) => {
    //   const result = await categoryCollection.find().toArray();
    //   res.send(result);
    // });
    //-------------------++++-----------------

    //-------------------++++-----------------
    //Query for tCategory
    app.get("/category", async (req, res) => {
      const result = await categoryCollection
        .find()
        .sort({ name: 1 })
        .toArray();
      res.send(result);
    });

    app.get("/category/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }; // Direct query
      const result = await categoryCollection.find(query).toArray(); // Pass query directly
      res.send(result);
    });
    //Delete category item
    app.delete("/category/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await categoryCollection.deleteOne(query);
      res.send(result);
    });
    // Add Category
    app.post("/category", async (req, res) => {
      const item = req.body;
      const result = await categoryCollection.insertOne(item);
      res.send(result);
    });
    // Edit Category
    app.patch("/category/:id", async (req, res) => {
      const item = req.body;
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          name: item.name,
        },
      };
      const result = await categoryCollection.updateOne(filter, updateDoc);
      res.send(result);
    });
    // -------------- SubCategory -------------------
    // Subcategory find all
    app.get("/subcategory", async (req, res) => {
      const result = await subCategoryCollection
        .find()
        .sort({ categoryName: 1, name: 1 })
        .toArray();
      res.send(result);
    });
    // Search subcategory item
    app.get("/subcategory/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }; // Direct query
      const result = await subCategoryCollection.find(query).toArray(); // Pass query directly
      res.send(result);
    });
    // Search subcategory item
    app.get("/subcategory2/:categoryName", async (req, res) => {
      const { categoryName } = req.params;
      // console.log("categoryName:",categoryName);
      const result = await subCategoryCollection
        .find({ categoryName })
        .toArray();
      res.send(result);
    });
    //Delete subcategory item
    app.delete("/subcategory/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await subCategoryCollection.deleteOne(query);
      res.send(result);
    });
    // Edit subcategory
    app.patch("/subcategory/:id", async (req, res) => {
      const { name, categoryName } = req.body;
      // console.log(name, categoryName);
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      // console.log(filter);
      const updateDoc = {
        $set: {
          name: name,
          categoryName: categoryName,
        },
      };
      const result = await subCategoryCollection.updateOne(filter, updateDoc);
      res.send(result);
    });
    // Add subcategory
    app.post("/subcategory", async (req, res) => {
      const item = req.body;
      const result = await subCategoryCollection.insertOne(item);
      res.send(result);
    });

    // ------------------ Subsubcategoty --------------
    // Subsubcategory
    app.get("/subsubcategory", async (req, res) => {
      const result = await subSubCategoryCollection
        .find()
        .sort({ subcategoryName: 1, name: 1 })
        .toArray();
      res.send(result);
    });
    //Find subsubcategory on specific id (_id)
    app.get("/subsubcategory/:subCategoryId", async (req, res) => {
      const id = req.params.subCategoryId;
      // const query = { subCategoryId: new ObjectId(id) }; // subCategoryId
      const query = { _id: new ObjectId(id) }; // _id
      // console.log(id);
      const result = await subSubCategoryCollection.find(query).toArray();
      res.send(result);
    });
    //Find subsubcategory on specific id (subCategoryId)
    app.get("/subsubcategory2/:subcategoryName", async (req, res) => {
      const { subcategoryName } = req.params;
      const result = await subSubCategoryCollection
        .find({ subcategoryName })
        .toArray();
      res.send(result);
    });
    //Delete subsubcategory item
    app.delete("/subsubcategory/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await subSubCategoryCollection.deleteOne(query);
      res.send(result);
    });
    // Edit subcategory
    app.patch("/subsubcategory/:id", async (req, res) => {
      const item = req.body;
      // console.log(item);
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          name: item.name,
          subcategoryName: item.subcategoryName,
        },
      };
      const result = await subSubCategoryCollection.updateOne(
        filter,
        updateDoc
      );
      res.send(result);
    });
    // Add subcategory
    app.post("/subsubcategory", async (req, res) => {
      const item = req.body;
      const result = await subSubCategoryCollection.insertOne(item);
      res.send(result);
    });

    //-------------------++++-----------------

    //---------++ For Brands ++--------
    app.get("/brands", async (req, res) => {
      const result = await brandCollection.find().toArray();
      res.send(result);
    });
    //-------------------++++-----------

    // Send a ping to confirm a successful connection
    // comment for deploy
    // await client.db("admin").command({ ping: 1 });
    // console.log(
    //   "Pinged your deployment. You successfully connected to MongoDB!"
    // );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);
//-------------------++++-----------------
app.get("/", (req, res) => {
  res.send("WOW, SERVER APP is running.!");
});

app.listen(port, () => {
  console.log(`SERVER APP listening on port ${port}`);
});
//-------------------++++-----------------
//-------------------++++-----------------
//
//-------------------++++-----------------
