from docx import Document

document = Document()
document.add_paragraph("[ID] q_001")
document.add_paragraph("[ANS] A")
document.add_paragraph("[SOL]")
document.add_paragraph("Explanation: Since x = 5, Option A provides the only mathematical solution.")
document.add_paragraph("")
document.add_paragraph("[ID] q_002")
document.add_paragraph("[ANS] B, C")
document.add_paragraph("[SOL]")
document.add_paragraph("For this multi-select question, both B and C encapsulate the correct conditions.")
document.add_paragraph("")

document.save('sample_answers.docx')
import base64
with open("sample_answers.docx", "rb") as f:
    print(base64.b64encode(f.read()).decode("utf-8"))
