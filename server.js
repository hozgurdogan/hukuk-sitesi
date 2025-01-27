const express = require('express');
const path = require('path');
const nodemailer = require('nodemailer');
const app = express();
const port = process.env.PORT || 3000;

// Body parser middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// View engine ayarı
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Statik dosyalar için middleware
app.use(express.static(path.join(__dirname, 'public')));

// E-posta transport ayarları
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'hasanmehmet84@gmail.com',
        pass: 'tjcu nqgv gtia aast'
    }
});

// Test e-posta bağlantısı
transporter.verify(function(error, success) {
    if (error) {
        console.log('SMTP Bağlantı Hatası:', error);
    } else {
        console.log('SMTP Bağlantısı Başarılı');
    }
});

// Ana sayfa
app.get('/', (req, res) => {
    res.render('index');
});

// Hakkımızda sayfası
app.get('/hakkimizda', (req, res) => {
    res.render('hakkimizda');
});

// Hizmetlerimiz sayfası
app.get('/hizmetlerimiz', (req, res) => {
    res.render('hizmetlerimiz');
});

// İletişim sayfası
app.get('/iletisim', (req, res) => {
    res.render('iletisim');
});

// Hizmet detay sayfaları
app.get('/hizmetlerimiz/ticaret-hukuku', (req, res) => {
    res.render('hizmetler/ticaret_hukuku');
});

app.get('/hizmetlerimiz/aile-hukuku', (req, res) => {
    res.render('hizmetler/aile_hukuku');
});

app.get('/hizmetlerimiz/ceza-hukuku', (req, res) => {
    res.render('hizmetler/ceza_hukuku');
});

// İletişim formu gönderimi
app.post('/iletisim', async (req, res) => {
    try {
        const { name, email, phone, subject, message } = req.body;

        console.log('Form verileri:', req.body); // Debug için

        // E-posta gönderme
        const info = await transporter.sendMail({
            from: '"Gürr & Duru Hukuk Bürosu" <hasanmehmet84@gmail.com>',
            to: 'hasanmehmet84@gmail.com',
            subject: `Yeni İletişim Formu: ${subject}`,
            html: `
                <h3>Yeni İletişim Formu Mesajı</h3>
                <p><strong>Ad Soyad:</strong> ${name}</p>
                <p><strong>E-posta:</strong> ${email}</p>
                <p><strong>Telefon:</strong> ${phone}</p>
                <p><strong>Konu:</strong> ${subject}</p>
                <p><strong>Mesaj:</strong></p>
                <p>${message}</p>
            `
        });

        console.log('E-posta gönderildi:', info); // Debug için

        res.json({ success: true, message: 'Mesajınız başarıyla gönderildi.' });
    } catch (error) {
        console.error('E-posta gönderme hatası:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Mesaj gönderilirken bir hata oluştu.',
            error: error.message 
        });
    }
});

app.listen(port, () => {
    console.log(`Sunucu http://localhost:${port} adresinde çalışıyor`);
}); 