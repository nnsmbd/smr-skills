# Sync report format

Print exactly this shape (the CLI renders it with `plan` / `propose` / `report`):

```text
ROADMAP UPDATE

<one-line summary>

3 изменения подтверждены
✓ <label> — «<card title>»
    ↳ <reason>
    ↳ <level> · <evidence> · <evidence>

2 требуют решения
? <label> — «<card title>»
    ↳ <why it is not confirmed>

1 конфликт с ручными правками (не применяются без вашего согласия)
⚠ <label> — «<card title>»
    ↳ поля, изменённые вручную: status

[Применить подтверждённое: 3]
```

Then add, in chat, what you could not verify and what the owner should decide. Keep labels in plain Russian ("Откат обновлений: работа началась (локально)"), not in engineer shorthand.
