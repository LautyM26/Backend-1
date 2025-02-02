import express from "express"
import productsManager from "../dao/productsManager.js" 
import { getDB } from "../dataBase/db.js"
import Product from "../models/products.js"

const router = express.Router()

router.get("/", async (req, res) => {

    let products = await productsManager.getProducts()

    res.setHeader("Content-Type", "application/json")
    return res.status(200).json({ payload: products })
});


router.get("/:pid", async (req, res) => {
    let { pid } = req.params
    pid = Number(pid)

    if (isNaN(pid)) {
        res.setHeader("Content-Type", "application/json")
        return res.status(400).json({ error: `Complete un pid numérico` })
    }

    try {
        let product = await productsManager.getProductById(pid)
        if (!product) {
            res.setHeader("Content-Type", "application/json")
            return res.status(404).json({ error: `No existe producto con pid ${pid}` })
        }

        res.setHeader("Content-Type", "application/json")
        return res.status(200).json({ product })

    } catch (error) {
        res.status(500).json({ error: "Error interno del servidor" })
    }
});


router.post("/", async (req, res) => {
    const newProductData = req.body

    try {
        const newProduct = await productsManager.addProduct(newProductData)

        return res.status(201).json({
            message: "Producto agregado exitosamente",
            product: newProduct
        })

    } catch (error) {
        return res.status(400).json({ error: error.message })
    }
});


router.put("/:pid", async (req, res) => {
    const { pid } = req.params
    const updatedFields = req.body

    if (updatedFields.id) {
        return res.status(400).json({ error: "El campo 'id' no se puede actualizar" })
    }

    try {
        const updatedProduct = await productsManager.updateProductById(pid, updatedFields)
        if (!updatedProduct) {
            return res.status(404).json({ error: `Producto con ID ${pid} no encontrado` })
        }

        return res.status(200).json({
            message: `Producto con ID ${pid} actualizado correctamente`,
            product: updatedProduct
        });

    } catch (error) {
        return res.status(500).json({ error: "Error interno del servidor" })
    }
});


router.delete("/:pid", async (req, res) => {
    const { pid } = req.params

    try {
        const deletedProduct = await productsManager.deleteProductById(pid)
        if (!deletedProduct) {
            return res.status(404).json({ error: `Producto con ID ${pid} no encontrado` })
        }

        return res.status(200).json({
            message: `Producto con ID ${pid} eliminado correctamente`,
            product: deletedProduct
        })

    } catch (error) {
        return res.status(500).json({ error: "Error interno del servidor" })
    }
});


router.get("/", async (req, res) => {
    try {
        const db = getDB()
        const products = await db.collection("products").find().toArray()
        return res.status(200).json({ payload: products })

    } catch (error) {
        return res.status(500).json({ error: "Error al obtener los productos" })
    }
});


router.post("/", async (req, res) => {
    const newProductData = req.body
    try {
        const db = getDB()
        const result = await db.collection("products").insertOne(newProductData)
        return res.status(201).json({
            message: "Producto agregado exitosamente",
            product: result.ops[0],
        })

    } catch (error) {
        return res.status(500).json({ error: "Error al agregar el producto" })
    }
});


router.get("/", async (req, res) => {
    const { limit = 10, page = 1, sort, query } = req.query

    try {
        const db = getDB()
        const filters = query ? { title: { $regex: query, $options: "i" } } : {}

        const options = {
            limit: parseInt(limit),
            skip: (parseInt(page) - 1) * parseInt(limit), 
            sort: sort ? { price: sort === "asc" ? 1 : -1 } : {}, 
        }

        const products = await db.collection("products").find(filters, options).toArray()
        const totalProducts = await db.collection("products").countDocuments(filters)

        return res.status(200).json({
            payload: products,
            totalPages: Math.ceil(totalProducts / parseInt(limit)),
            currentPage: parseInt(page),
        })

    } catch (error) {
        console.error("Error al obtener los productos:", error)
        return res.status(500).json({ error: "Error al obtener los productos" })
    }
});


router.get("/products", async (req, res) => {
    try {
        const { query, limit = 10, page = 1, sort } = req.query

        const searchFilter = query
            ? { title: { $regex: query, $options: "i" } } 
            : {}

        const itemsPerPage = parseInt(limit, 10)
        const currentPage = parseInt(page, 10)
        const sortOrder = sort ? { price: sort === "asc" ? 1 : -1 } : {}

        const totalProducts = await Product.countDocuments(searchFilter)

        const totalPages = Math.ceil(totalProducts / itemsPerPage)

        const products = await Product.find(searchFilter)
            .sort(sortOrder)
            .skip((currentPage - 1) * itemsPerPage)
            .limit(itemsPerPage)

        const hasPrevPage = currentPage > 1;
        const hasNextPage = currentPage < totalPages;

        res.status(200).json({
            status: "success",
            payload: products,
            totalPages,
            prevPage: hasPrevPage ? currentPage - 1 : null,
            nextPage: hasNextPage ? currentPage + 1 : null,
            page: currentPage,
            hasPrevPage,
            hasNextPage,
            prevLink: hasPrevPage ? `/products?limit=${limit}&page=${currentPage - 1}&sort=${sort || ""}` : null,
            nextLink: hasNextPage ? `/products?limit=${limit}&page=${currentPage + 1}&sort=${sort || ""}` : null,
        })
        
    } catch (error) {
        console.error("Error al obtener los productos:", error)
        res.status(500).json({ status: "error", message: "Error al obtener los productos" })
    }
})

export default router
