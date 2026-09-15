const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Categorias válidas
const CATEGORIES = ['matutino', 'vespertino', 'noturno'];

// Cria pasta uploads na raiz (não em node_modules)
const uploadsBase = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsBase)) {
    fs.mkdirSync(uploadsBase, { recursive: true });
}

// Cria pastas de categoria
CATEGORIES.forEach(cat => {
    const dir = path.join(uploadsBase, cat);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Configuração do multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const category = CATEGORIES.includes(req.body.category)
            ? req.body.category
            : 'matutino';
        cb(null, path.join(uploadsBase, category));
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        const allowed = ['.xlsx', '.xls', '.csv'];
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, allowed.includes(ext));
    }
});

app.use(express.static(__dirname));

// ===== UPLOAD =====
app.post('/upload', upload.single('file'), (req, res) => {
    res.json({ success: true });
});

// ===== LISTAR ARQUIVOS =====
app.get('/files', (req, res) => {
    const category = req.query.category || 'matutino';

    if (!CATEGORIES.includes(category)) {
        return res.status(400).json({ error: 'Categoria inválida' });
    }

    const dir = path.join(uploadsBase, category);
    if (!fs.existsSync(dir)) return res.json([]);

    const files = fs.readdirSync(dir).map(f => {
        const stats = fs.statSync(path.join(dir, f));
        // Remove o timestamp do nome na exibição
        const displayName = f.replace(/^\d+-/, '');
        return {
            name: displayName,
            realName: f,
            size: (stats.size / 1024).toFixed(2) + ' KB',
            date: stats.mtime.toLocaleDateString('pt-BR')
        };
    });

    res.json(files);
});

// ===== DOWNLOAD =====
app.get('/download/:category/:name', (req, res) => {
    const { category, name } = req.params;

    if (!CATEGORIES.includes(category)) {
        return res.status(400).send('Categoria inválida');
    }

    const dir = path.join(uploadsBase, category);
    if (!fs.existsSync(dir)) return res.status(404).send('Arquivo não encontrado');

    // Procura arquivo cujo nome (sem timestamp) corresponda
    const files = fs.readdirSync(dir);
    const match = files.find(f => f.replace(/^\d+-/, '') === name);

    if (!match) return res.status(404).send('Arquivo não encontrado');

    res.download(path.join(dir, match), name);
});

// ===== EXCLUIR =====
app.delete('/delete/:category/:name', (req, res) => {
    const { category, name } = req.params;

    if (!CATEGORIES.includes(category)) {
        return res.status(400).json({ error: 'Categoria inválida' });
    }

    const dir = path.join(uploadsBase, category);
    const files = fs.readdirSync(dir);
    const match = files.find(f => f.replace(/^\d+-/, '') === name);

    if (!match) return res.status(404).json({ error: 'Arquivo não encontrado' });

    fs.unlinkSync(path.join(dir, match));
    res.json({ success: true });
});

app.listen(PORT, () => {
    console.log(`\n🥪 Lanchonete Modelo - Servidor rodando!`);
    console.log(`🌐 Acesse: http://localhost:${PORT}\n`);
});