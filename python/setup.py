from setuptools import setup, find_packages

with open("../README.md", "r", encoding="utf-8") as fh: #This path is now correct
    long_description = fh.read()

setup(
    name="gsheetdb",
    version="1.2.0",
    author="Lucas Prett Campagna",
    description="A simple way to use Google Sheet as your Data Base with own authentication system.",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/lucas-campagna/gsheetdb",
    packages=find_packages(where="gsheetdb"), #Now find packages within gsheetdb
    package_dir={"": "gsheetdb"}, #Tell setuptools to look for packages in the gsheetdb directory
    classifiers=[
        "Programming Language :: Python :: 3",
        "License :: OSI Approved :: ISC License (ISCL)",
        "Operating System :: OS Independent",
    ],
    python_requires='>=3.6',
    install_requires=[
        'requests',
    ],
)