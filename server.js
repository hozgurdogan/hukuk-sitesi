const express = require('express');
const path = require('path');
const nodemailer = require('nodemailer');
const i18n = require('i18n');
const app = express();
const port = process.env.PORT || 3000;
const cookieParser = require('cookie-parser');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const mongoose = require('mongoose');
const User = require('./models/User');
const Article = require('./models/Article');

// MongoDB bağlantısı
mongoose.connect('mongodb://127.0.0.1:27017/hukukburosu', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('MongoDB bağlantısı başarılı');
    
    // Middleware
    app.use(express.static('public'));
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(cookieParser());
    app.use(session({
        secret: 'gizli-anahtar',
        resave: false,
        saveUninitialized: false,
        store: MongoStore.create({
            mongoUrl: 'mongodb://127.0.0.1:27017/hukukburosu'
        }),
        cookie: {
            maxAge: 1000 * 60 * 60 * 24 // 1 gün
        }
    }));
    app.use(i18n.init);

    // View engine
    app.set('view engine', 'ejs');
    app.set('views', path.join(__dirname, 'views'));

    // i18n yapılandırması
    i18n.configure({
        locales: ['tr', 'en', 'ar'],
        defaultLocale: 'tr',
        directory: path.join(__dirname, 'locales'),
        objectNotation: true,
        cookie: 'lang',
        queryParameter: 'lang'
    });

    // İlk admin kullanıcısı oluşturma route'u (GEÇİCİ - KULLANDIKTAN SONRA SİLİN)
    app.get('/create-first-admin', async (req, res) => {
        try {
            const adminCount = await User.countDocuments({ isAdmin: true });
            if (adminCount === 0) {
                const admin = new User({
                    username: 'admin',
                    password: 'admin123',
                    isAdmin: true
                });
                await admin.save();
                res.send('İlk admin kullanıcısı oluşturuldu. Kullanıcı adı: admin, Şifre: admin123');
            } else {
                res.send('Zaten admin kullanıcısı mevcut');
            }
        } catch (error) {
            console.error('Admin oluşturma hatası:', error);
            res.status(500).send('Hata oluştu: ' + error.message);
        }
    });

    // Admin kullanıcı kaydı için route
    app.get('/admin/register', (req, res) => {
        try {
            if (req.session.user && req.session.user.isAdmin) {
                res.render('admin/register', {
                    lang: req.getLocale(),
                    user: req.session.user,
                    error: null
                });
            } else {
                res.redirect('/admin/login');
            }
        } catch (error) {
            console.error('Kayıt sayfası hatası:', error);
            res.status(500).render('admin/register', {
                lang: req.getLocale(),
                error: 'Bir hata oluştu'
            });
        }
    });

    app.post('/admin/register', async (req, res) => {
        try {
            const { username, password } = req.body;
            
            // Kullanıcı adının benzersiz olduğunu kontrol et
            const existingUser = await User.findOne({ username });
            if (existingUser) {
                return res.render('admin/register', {
                    lang: req.getLocale(),
                    user: req.session.user,
                    error: 'Bu kullanıcı adı zaten kullanılıyor'
                });
            }

            const user = new User({ username, password, isAdmin: true });
            await user.save();
            
            res.redirect('/admin/makaleler');
        } catch (error) {
            console.error('Kullanıcı kaydı hatası:', error);
            res.render('admin/register', {
                lang: req.getLocale(),
                user: req.session.user,
                error: 'Kullanıcı kaydı sırasında bir hata oluştu'
            });
        }
    });

    // Dil değiştirme route'u
    app.get('/change-language/:lang', (req, res) => {
        const lang = req.params.lang;
        if (['tr', 'en', 'ar'].includes(lang)) {
            res.cookie('lang', lang, { maxAge: 365 * 24 * 60 * 60 * 1000 }); // 1 yıl
            req.setLocale(lang);
        }
        res.redirect('back');
    });

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

    // Admin middleware
    const isAdmin = (req, res, next) => {
        if (req.session.user && req.session.user.isAdmin) {
            next();
        } else {
            res.redirect('/admin/login');
        }
    };

    // Ana sayfa
    app.get('/', (req, res) => {
        const lang = req.cookies.lang || 'tr';
        res.render('index', { 
            lang: lang,
            user: req.session.user
        });
    });

    // Hakkımızda sayfası
    app.get('/hakkimizda', (req, res) => {
        const lang = req.cookies.lang || 'tr';
        res.render('hakkimizda', { 
            lang: lang,
            user: req.session.user
        });
    });

    // Hizmetlerimiz sayfası
    app.get('/hizmetlerimiz', (req, res) => {
        const lang = req.cookies.lang || 'tr';
        res.render('hizmetlerimiz', { 
            lang: lang,
            user: req.session.user
        });
    });

    // İletişim sayfası
    app.get('/iletisim', (req, res) => {
        const lang = req.cookies.lang || 'tr';
        res.render('iletisim', { 
            lang: lang,
            user: req.session.user
        });
    });

    // Hizmet detay sayfaları
    app.get('/hizmetlerimiz/ticaret-hukuku', (req, res) => {
        const lang = req.cookies.lang || 'tr';
        res.render('hizmetler/ticaret_hukuku', { 
            lang: lang
        });
    });

    app.get('/hizmetlerimiz/aile-hukuku', (req, res) => {
        const lang = req.cookies.lang || 'tr';
        res.render('hizmetler/aile_hukuku', { 
            lang: lang
        });
    });

    app.get('/hizmetlerimiz/ceza-hukuku', (req, res) => {
        const lang = req.cookies.lang || 'tr';
        res.render('hizmetler/ceza_hukuku', { 
            lang: lang
        });
    });

    // İletişim formu
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

    // Makale route'ları
    app.get('/makaleler', async (req, res) => {
        try {
            const articles = await Article.find().populate('author', 'username').sort('-createdAt');
            res.render('makaleler', { 
                lang: req.getLocale(),
                user: req.session.user,
                articles
            });
        } catch (error) {
            res.status(500).send('Bir hata oluştu');
        }
    });

    app.get('/makale/:id', async (req, res) => {
        try {
            const article = await Article.findById(req.params.id).populate('author', 'username');
            if (!article) {
                return res.status(404).send('Makale bulunamadı');
            }
            
            // Görüntülenme sayısını artır
            article.views += 1;
            await article.save();
            
            res.render('makale', { 
                lang: req.getLocale(),
                user: req.session.user,
                article
            });
        } catch (error) {
            res.status(500).send('Bir hata oluştu');
        }
    });

    // Admin route'ları
    app.get('/admin/login', (req, res) => {
        try {
            if (req.session.user && req.session.user.isAdmin) {
                res.redirect('/admin/makaleler');
            } else {
                res.render('admin/login', { 
                    lang: req.getLocale(),
                    error: null 
                });
            }
        } catch (error) {
            console.error('Login sayfası hatası:', error);
            res.status(500).render('admin/login', {
                lang: req.getLocale(),
                error: 'Bir hata oluştu'
            });
        }
    });

    app.post('/admin/login', async (req, res) => {
        try {
            const user = await User.findOne({ username: req.body.username });
            if (!user || !user.isAdmin || !(await user.comparePassword(req.body.password))) {
                return res.render('admin/login', { 
                    lang: req.getLocale(),
                    error: 'Geçersiz kullanıcı adı veya şifre' 
                });
            }
            
            req.session.user = {
                id: user._id,
                username: user.username,
                isAdmin: user.isAdmin
            };
            
            res.redirect('/admin/makaleler');
        } catch (error) {
            res.render('admin/login', { 
                lang: req.getLocale(),
                error: 'Bir hata oluştu' 
            });
        }
    });

    app.get('/admin/makaleler', isAdmin, async (req, res) => {
        try {
            const articles = await Article.find().populate('author', 'username').sort('-createdAt');
            res.render('admin/makaleler', { 
                lang: req.getLocale(),
                user: req.session.user,
                articles
            });
        } catch (error) {
            res.status(500).send('Bir hata oluştu');
        }
    });

    app.get('/admin/makale/ekle', isAdmin, (req, res) => {
        res.render('admin/makale-ekle', { 
            lang: req.getLocale(),
            user: req.session.user
        });
    });

    app.post('/admin/makale/ekle', isAdmin, async (req, res) => {
        try {
            const article = new Article({
                title: req.body.title,
                category: req.body.category,
                content: req.body.content,
                author: req.session.user.id
            });
            
            await article.save();
            res.redirect('/admin/makaleler');
        } catch (error) {
            res.status(500).send('Bir hata oluştu');
        }
    });

    app.get('/admin/makale/duzenle/:id', isAdmin, async (req, res) => {
        try {
            const article = await Article.findById(req.params.id);
            if (!article) {
                return res.status(404).send('Makale bulunamadı');
            }
            
            res.render('admin/makale-duzenle', { 
                lang: req.getLocale(),
                user: req.session.user,
                article
            });
        } catch (error) {
            res.status(500).send('Bir hata oluştu');
        }
    });

    app.post('/admin/makale/duzenle/:id', isAdmin, async (req, res) => {
        try {
            const article = await Article.findById(req.params.id);
            if (!article) {
                return res.status(404).send('Makale bulunamadı');
            }
            
            article.title = req.body.title;
            article.category = req.body.category;
            article.content = req.body.content;
            article.updatedAt = Date.now();
            
            await article.save();
            res.redirect('/admin/makaleler');
        } catch (error) {
            res.status(500).send('Bir hata oluştu');
        }
    });

    app.post('/admin/makale/sil/:id', isAdmin, async (req, res) => {
        try {
            await Article.findByIdAndDelete(req.params.id);
            res.redirect('/admin/makaleler');
        } catch (error) {
            res.status(500).send('Bir hata oluştu');
        }
    });

    app.get('/admin/logout', (req, res) => {
        req.session.destroy();
        res.redirect('/');
    });

    // Sunucuyu başlat
    app.listen(port, () => {
        console.log(`Sunucu http://localhost:${port} adresinde çalışıyor`);
    });

}).catch((err) => {
    console.error('MongoDB bağlantı hatası:', err);
}); 