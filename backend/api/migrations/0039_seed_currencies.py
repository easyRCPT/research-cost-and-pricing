"""
The workbook's currencies (Lookup Tables U36:X56, "1 AUD ="), for databases
that already hold rates (#152).

A fresh database is empty here and gets them from seeds/lookups.json with the
rest of the rates, so only a version that already has salary rates is filled:
writing rows into an empty one would collide with the seed's.
"""

from decimal import Decimal

from django.db import migrations

CURRENCIES = [
    ("AUD", "Australian Dollar", "1"),
    ("BHD", "Bahraini Dinar", "0.264271"),
    ("CAD", "Canadian Dollar", "0.985703"),
    ("CHF", "Swiss Franc", "0.571129"),
    ("CNY", "Chinese Yuan", "4.742069"),
    ("DKK", "Danish Krone", "4.559951"),
    ("EUR", "Euro", "0.609959"),
    ("GBP", "Pound Sterling", "0.522417"),
    ("HKD", "Hong Kong Dollar", "5.513622"),
    ("IDR", "Indonesian Rupiah", "12581.675106"),
    ("INR", "Indian Rupee", "66.954629"),
    ("JPY", "Japanese Yen", "111.283991"),
    ("KRW", "South Korean Won", "998.148333"),
    ("MYR", "Malaysian Ringgit", "2.874039"),
    ("NOK", "Norwegian Krona", "6.704966"),
    ("NZD", "New Zealand Dollar", "1.198579"),
    ("SEK", "Swedish Krona", "6.685676"),
    ("SGD", "Singapore Dollar", "0.901138"),
    ("THB", "Thai Baht", "23.268913"),
    ("TWD", "New Taiwan Dollar", "22.657292"),
    ("USD", "United States Dollar", "0.70285"),
]


def add_currencies(apps, schema_editor):
    LookupConfiguration = apps.get_model("api", "LookupConfiguration")
    SalaryRate = apps.get_model("api", "SalaryRate")
    Currency = apps.get_model("api", "Currency")

    config = LookupConfiguration.objects.filter(pk=1).first()
    if config is None:
        return
    version_id = config.current_version_id
    if not SalaryRate.objects.filter(version_id=version_id).exists():
        return
    if Currency.objects.filter(version_id=version_id).exists():
        return
    Currency.objects.bulk_create(
        Currency(code=code, name=name, rate=Decimal(rate), version_id=version_id)
        for code, name, rate in CURRENCIES
    )


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0038_currency"),
    ]

    operations = [
        migrations.RunPython(add_currencies, migrations.RunPython.noop),
    ]
