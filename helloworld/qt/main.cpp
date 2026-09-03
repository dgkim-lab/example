#include <QApplication>
#include <QAction>
#include <QDialog>
#include <QDialogButtonBox>
#include <QKeySequence>
#include <QLabel>
#include <QMainWindow>
#include <QMenuBar>
#include <QPushButton>
#include <QVBoxLayout>
#include <QWidget>

namespace {

class MainWindow final : public QMainWindow {
public:
    MainWindow()
    {
        setWindowTitle(QStringLiteral("Hello World"));
        resize(720, 480);
        setMinimumSize(560, 380);

        auto *central = new QWidget(this);
        central->setObjectName(QStringLiteral("centralWidget"));
        auto *pageLayout = new QVBoxLayout(central);
        pageLayout->setContentsMargins(48, 42, 48, 42);
        pageLayout->setAlignment(Qt::AlignCenter);

        auto *card = new QWidget(central);
        card->setObjectName(QStringLiteral("card"));
        card->setMaximumWidth(540);
        auto *cardLayout = new QVBoxLayout(card);
        cardLayout->setContentsMargins(42, 38, 42, 34);
        cardLayout->setSpacing(14);

        auto *eyebrow = new QLabel(QStringLiteral("A tiny Qt example"), card);
        eyebrow->setObjectName(QStringLiteral("eyebrow"));
        eyebrow->setAlignment(Qt::AlignCenter);

        auto *title = new QLabel(QStringLiteral("Hello, world!"), card);
        title->setObjectName(QStringLiteral("title"));
        title->setAlignment(Qt::AlignCenter);

        auto *description = new QLabel(
            QStringLiteral("A simple desktop app with just enough personality."), card);
        description->setObjectName(QStringLiteral("description"));
        description->setAlignment(Qt::AlignCenter);
        description->setWordWrap(true);

        auto *helloButton = new QPushButton(QStringLiteral("Say hello"), card);
        helloButton->setObjectName(QStringLiteral("helloButton"));
        helloButton->setCursor(Qt::PointingHandCursor);
        helloButton->setMinimumHeight(44);

        auto *status = new QLabel(QStringLiteral("Ready when you are."), card);
        status->setObjectName(QStringLiteral("status"));
        status->setAlignment(Qt::AlignCenter);

        cardLayout->addWidget(eyebrow);
        cardLayout->addWidget(title);
        cardLayout->addWidget(description);
        cardLayout->addSpacing(10);
        cardLayout->addWidget(helloButton);
        cardLayout->addWidget(status);
        pageLayout->addWidget(card);

        connect(helloButton, &QPushButton::clicked, this, [status] {
            status->setText(QStringLiteral("Hello from Qt! 👋"));
        });

        setCentralWidget(central);
        createMenus();
        applyContentStyle(central);
    }

private:
    void createMenus()
    {
        auto *helpMenu = menuBar()->addMenu(QStringLiteral("&Help"));
        auto *aboutAction = helpMenu->addAction(QStringLiteral("&About Hello World"));
        aboutAction->setShortcut(QKeySequence(QStringLiteral("Ctrl+Shift+A")));
        connect(aboutAction, &QAction::triggered, this, &MainWindow::showAbout);

        auto *aboutQtAction = helpMenu->addAction(QStringLiteral("About &Qt"));
        connect(aboutQtAction, &QAction::triggered, qApp, &QApplication::aboutQt);
    }

    void showAbout()
    {
        QDialog dialog(this);
        dialog.setWindowTitle(QStringLiteral("About Hello World"));
        dialog.setModal(true);
        dialog.setMinimumWidth(360);

        auto *layout = new QVBoxLayout(&dialog);
        layout->setContentsMargins(28, 26, 28, 22);
        layout->setSpacing(10);

        auto *name = new QLabel(QStringLiteral("Hello World"), &dialog);
        name->setObjectName(QStringLiteral("aboutTitle"));
        name->setAlignment(Qt::AlignCenter);
        auto *copy = new QLabel(
            QStringLiteral("A friendly Qt desktop example.\nVersion 1.0.0"), &dialog);
        copy->setAlignment(Qt::AlignCenter);
        copy->setObjectName(QStringLiteral("aboutCopy"));
        copy->setWordWrap(true);

        auto *buttons = new QDialogButtonBox(QDialogButtonBox::Ok, &dialog);
        connect(buttons, &QDialogButtonBox::accepted, &dialog, &QDialog::accept);
        layout->addWidget(name);
        layout->addWidget(copy);
        layout->addSpacing(8);
        layout->addWidget(buttons);
        dialog.exec();
    }

    void applyContentStyle(QWidget *content)
    {
        content->setStyleSheet(QStringLiteral(R"(
            #centralWidget { background: #f4f7fb; }
            #card { background: #ffffff; border: 1px solid #e0e7f0; border-radius: 20px; }
            #eyebrow { color: #5477b8; font-size: 13px; font-weight: 600; }
            #title { color: #19253a; font-size: 34px; font-weight: 700; }
            #description { color: #65738a; font-size: 15px; }
            #helloButton { background: #2864d7; color: #ffffff; border: 0; border-radius: 10px; font-size: 15px; font-weight: 600; }
            #helloButton:hover { background: #1f56c1; }
            #helloButton:pressed { background: #17479f; }
            #status { color: #8491a5; font-size: 13px; }
        )"));
    }
};

} // namespace

int main(int argc, char *argv[])
{
    QApplication app(argc, argv);
    app.setApplicationName(QStringLiteral("Hello World"));
    app.setApplicationVersion(QStringLiteral("1.0.0"));
    app.setOrganizationName(QStringLiteral("Example"));

    MainWindow window;
    window.show();
    return app.exec();
}
