#!/usr/bin/env perl

# HOW-TO-BUILD
# This script depends on JavaScript::Minifier, so use cpan to install first:
#    cpan JavaScript::Minifier
# Then, in the source tree, simply type "./build.pl" or "perl build.pl". And
# you should see data-drive.js (uncompressed version) and data-drive.min.js
# (compressed version)

use feature "switch";

use File::Basename;

sub embed_license {
    my $outfh = $_[0];
    my $input;
    open ($input, "<", $_[1]) or die "Unable to open $_[1]";
    while (<$input>) {
        print $outfh "// $_";
    }
    close ($input);
    print $outfh "\n\n";
}

sub merge_js {
    my $outfh = shift;
    my @src_files = @_;

    for (@src_files) {
        my $input;
        open ($input, "<", $_) or die "Unable to open $_";
        print $outfh "// " . basename($_) . "\n\n";
        my $state = "start";
        while (<$input>) {
            my $line = $_;
            given ($state) {
                when ("start") {
                    if ($line =~ /^\/\/\s[-]+$/) {
                        $state = "copy";
                    }
                }
                when ("copy") {
                    if ($line !~ /^\s*\/\/#require\s+.*$/) {
                        print $outfh $line;
                    }
                }
            }
        }
        print $outfh "\n\n";
        close ($input);
    }
}

my $OUT_SRC  = "data-drive.js";
my $LIC_FILE = "LICENSE";
my $DIR_CORE = "src/dd.js/core";
my @SRC_CORE = ( "base.js", "observer.js", "extensions.js", "model.js", "dombind.js" );
my $DIR_EXTR = "src/dd.js/extra";
my @SRC_EXTR = ( "ajaxconnect.js" );

sub combine {
    my $outfh;
    open ($outfh, ">", $OUT_SRC) or die "Unable to write to $OUT_SRC";
    embed_license ($outfh, $LIC_FILE) or die "Unable to open $LIC_FILE";
    merge_js ($outfh, map { "$DIR_CORE/" . $_ } @SRC_CORE);
    merge_js ($outfh, map { "$DIR_EXTR/" . $_ } @SRC_EXTR);
    close ($outfh);
}

# please use 'cpan JavaScript::Minifier' to install the module
use JavaScript::Minifier;

my $OUT_MIN = "data-drive.min.js";

sub minify {
    my $combined;
    open ($combined, "<", $OUT_SRC) or die "Unable to open $OUT_SRC";
    my $minified;
    open ($minified, ">", $OUT_MIN) or die "Unable to write to $OUT_MIN";
    JavaScript::Minifier::minify (input => *$combined,
                                  outfile => *$minified,
                                  stripDebug => 1,
                                  copyright => 'Copyright (c) 2013, Yisui Hu <easeway@gmail.com>');
    close ($minified);
    close ($combined);
}

sub main {
    combine;
    minify;
}

main;
