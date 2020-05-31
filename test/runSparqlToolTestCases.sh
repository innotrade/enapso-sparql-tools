echo "SPARQL Tool Test Suite"
echo "(C) Copyright 2020 Innotrade GmbH, Herzogenrath, NRW, Germany"
echo
# save the absolute path of the report file
REPORT_FILE=sparqlToolTestReport.txt
echo "Removing Previous Report File..."
rm $REPORT_FILE
# run the test suite of sparql toll project and redirect the output to the enapso report file
echo "Running Tests for enapso-sparql-tool..."
npm test >> $REPORT_FILE

echo "Enapso Test Suite Done"
echo "Please check file $REPORT_FILE"
