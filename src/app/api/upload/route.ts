import { Hono } from "hono";

const uploadAPI = new Hono();

// 📌 File Upload Endpoint (POST /api/upload-photo)
uploadAPI.post("/photo", async (c) => {
  try {
    const r2 = c.env.R2_BUCKET; // ✅ Get R2 binding

    // Ensure the uploaded file is an image.
    const contentType = c.req.header("content-type");
    if (!contentType || !contentType.startsWith("image/")) {
      return c.json({ error: "Invalid file type. Only images are allowed." }, 400);
    }

    // Read the request body as an ArrayBuffer.
    const fileData = await c.req.arrayBuffer();

    // Generate a unique file name.
    const fileExtension = contentType.split("/")[1]; // e.g., 'jpeg', 'png'
    const fileName = `${Date.now()}-${crypto.randomUUID()}.${fileExtension}`;

    // Upload the file to Cloudflare R2.
    await r2.put(fileName, fileData, {
      httpMetadata: { contentType },
    });

    // Construct the public URL for the uploaded file.
    const publicUrl = `https://your-r2-endpoint/${fileName}`; // 🔴 Replace with your R2 endpoint

    return c.json({ message: "Photo uploaded successfully!", url: publicUrl });
  } catch (error) {
    return c.json({ error: error.toString() }, 500);
  }
});

export default uploadAPI;
