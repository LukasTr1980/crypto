python3 -m venv venv

source venv/bin/activate

pip install -r requirements.txt

#Only with gitleaks in path
pre-commit install

npm install
